"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState, type FormEvent,
} from "react";
import {
  Award, BriefcaseBusiness, GraduationCap, Plus, Trash2,
  Pencil, X, Undo2,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import ConfirmDialog from "@/components/confirm-dialog";

type Education = {
  id: string;
  institution: string;
  qualification: string;
  field_of_study: string;
  start_year: number | null;
  end_year: number | null;
  description: string;
  created_at: string;
};

type Work = {
  id: string;
  company: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  created_at: string;
};

type Kind = "education" | "experience";

const emptyEducation = {
  institution: "",
  qualification: "",
  field_of_study: "",
  start_year: "",
  end_year: "",
  description: "",
};

const emptyWork = {
  company: "",
  role: "",
  start_date: "",
  end_date: "",
  description: "",
};

type UndoRecord =
  | { kind: "education"; record: Education }
  | { kind: "experience"; record: Work };

function messageForError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("23505")) {
      return "Rekod ini sudah wujud. Semak butiran sebelum menyimpan.";
    }
    if (error.message.includes("23514")) {
      return "Maklumat melanggar had atau format database.";
    }
    return error.message;
  }
  return "Rekod tidak dapat disimpan. Sila cuba lagi.";
}

export default function HistoryEditor({
  kind, userId,
}: {
  kind: Kind;
  userId: string;
}) {
  const client = useMemo(() => getSupabaseClient(), []);
  const formRef = useRef<HTMLFormElement>(null);

  const [education, setEducation] = useState<Education[]>([]);
  const [experience, setExperience] = useState<Work[]>([]);
  const [eduForm, setEduForm] = useState(emptyEducation);
  const [workForm, setWorkForm] = useState(emptyWork);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<UndoRecord | null>(null);
  const [undoRecord, setUndoRecord] = useState<UndoRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const table = kind === "education" ? "education" : "work_experience";
  const isEducation = kind === "education";
  const Icon = isEducation ? GraduationCap : BriefcaseBusiness;

  const load = useCallback(async () => {
    const result = await client
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (result.error) throw new Error(result.error.message);

    if (kind === "education") {
      setEducation((result.data ?? []) as Education[]);
    } else {
      setExperience((result.data ?? []) as Work[]);
    }
  }, [client, kind, table, userId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (active) await load();
      } catch (error) {
        if (active) setErrorMessage(messageForError(error));
      }
    })();
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!undoRecord) return;
    const timeout = window.setTimeout(() => setUndoRecord(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [undoRecord]);

  function clearForm() {
    setEditingId(null);
    setEduForm(emptyEducation);
    setWorkForm(emptyWork);
  }

  function beginEdit(record: Education | Work) {
    setErrorMessage("");
    setMessage("");
    setEditingId(record.id);
    if ("institution" in record) {
      setEduForm({
        institution: record.institution,
        qualification: record.qualification,
        field_of_study: record.field_of_study,
        start_year: record.start_year?.toString() ?? "",
        end_year: record.end_year?.toString() ?? "",
        description: record.description,
      });
    } else {
      setWorkForm({
        company: record.company,
        role: record.role,
        start_date: record.start_date ?? "",
        end_date: record.end_date ?? "",
        description: record.description,
      });
    }

    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (isEducation) {
        if (!eduForm.institution.trim() || !eduForm.qualification.trim()) {
          throw new Error("Nama institusi dan kelayakan wajib diisi.");
        }

        const payload = {
          institution: eduForm.institution.trim(),
          qualification: eduForm.qualification.trim(),
          field_of_study: eduForm.field_of_study.trim(),
          start_year: eduForm.start_year ? Number(eduForm.start_year) : null,
          end_year: eduForm.end_year ? Number(eduForm.end_year) : null,
          description: eduForm.description.trim(),
        };

        if (
          payload.start_year &&
          payload.end_year &&
          payload.start_year > payload.end_year
        ) {
          throw new Error("Tahun tamat tidak boleh mendahului tahun mula.");
        }

        const previous = [...education];
        if (editingId) {
          setEducation((items) =>
            items.map((item) =>
              item.id === editingId ? { ...item, ...payload } : item,
            ),
          );
        }

        const result = editingId
          ? await client.from("education").update(payload)
            .eq("id", editingId).eq("user_id", userId)
          : await client.from("education").insert({
            ...payload,
            user_id: userId,
          });

        if (result.error) {
          setEducation(previous);
          throw new Error(result.error.message);
        }
      } else {
        if (!workForm.company.trim() || !workForm.role.trim()) {
          throw new Error("Nama organisasi dan jawatan wajib diisi.");
        }
        if (
          workForm.start_date &&
          workForm.end_date &&
          workForm.start_date > workForm.end_date
        ) {
          throw new Error("Tarikh tamat tidak boleh mendahului tarikh mula.");
        }

        const payload = {
          company: workForm.company.trim(),
          role: workForm.role.trim(),
          start_date: workForm.start_date || null,
          end_date: workForm.end_date || null,
          description: workForm.description.trim(),
        };

        const previous = [...experience];
        if (editingId) {
          setExperience((items) =>
            items.map((item) =>
              item.id === editingId ? { ...item, ...payload } : item,
            ),
          );
        }

        const result = editingId
          ? await client.from("work_experience").update(payload)
            .eq("id", editingId).eq("user_id", userId)
          : await client.from("work_experience").insert({
            ...payload,
            user_id: userId,
          });

        if (result.error) {
          setExperience(previous);
          throw new Error(result.error.message);
        }
      }

      setMessage(editingId ? "Rekod berjaya dikemas kini." : "Rekod baharu berjaya ditambah.");
      clearForm();
      await load();
    } catch (error) {
      setErrorMessage(messageForError(error));
      try { await load(); } catch { /* preserve original failure */ }
    } finally {
      setBusy(false);
    }
  }

  async function deleteConfirmed() {
    const target = pendingDeletion;
    setPendingDeletion(null);
    if (!target || busy) return;
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    try {
      const result = await client.from(table).delete()
        .eq("id", target.record.id).eq("user_id", userId);
      if (result.error) throw new Error(result.error.message);

      if (editingId === target.record.id) clearForm();
      await load();
      setUndoRecord(target);
      setMessage("Rekod dipadam. Anda boleh buat asal dalam 6 saat.");
    } catch (error) {
      setErrorMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  }

  async function undoDeletion() {
    const target = undoRecord;
    if (!target || busy) return;
    setBusy(true);
    setErrorMessage("");

    try {
      const result = target.kind === "education"
        ? await client.from("education").insert({
          ...target.record,
          user_id: userId,
        })
        : await client.from("work_experience").insert({
          ...target.record,
          user_id: userId,
        });
      if (result.error) throw new Error(result.error.message);
      await load();
      setMessage("Rekod dipulihkan.");
      setUndoRecord(null);
    } catch (error) {
      setErrorMessage(messageForError(error));
    } finally {
      setBusy(false);
    }
  }

  const items = isEducation ? education : experience;

  return (
    <>
      <div className="tf-headingrow">
        <div>
          <div className="tf-eyebrow">REKOD PERJALANAN PROFESIONAL</div>
          <h1>{isEducation ? "Sejarah Pendidikan" : "Pengalaman Kerja"}</h1>
          <p>
            {isEducation
              ? "Tambah dan kemas kini kelayakan serta pembelajaran anda."
              : "Urus jawatan, tanggungjawab dan sejarah pekerjaan anda."}
          </p>
        </div>
        <span className="tf-pill">
          <Icon size={15} /> {items.length} rekod
        </span>
      </div>

      <div className="tf-two">
        <form className="tf-card tf-section tf-form" ref={formRef} onSubmit={(event) => void save(event)}>
          <div className="tf-card-head">
            <h3>
              {editingId ? "Kemaskini Rekod" : isEducation ? "Tambah Pendidikan" : "Tambah Pekerjaan"}
            </h3>
            {editingId ? <Pencil size={18} /> : <Plus size={18} />}
          </div>

          {isEducation ? (
            <>
              <label>Institusi
                <input required maxLength={180} value={eduForm.institution}
                  onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })} />
              </label>
              <label>Kelayakan / Sijil
                <input required maxLength={180} value={eduForm.qualification}
                  onChange={(e) => setEduForm({ ...eduForm, qualification: e.target.value })} />
              </label>
              <label>Bidang Pengajian
                <input maxLength={180} value={eduForm.field_of_study}
                  onChange={(e) => setEduForm({ ...eduForm, field_of_study: e.target.value })} />
              </label>
              <div className="tf-formgrid">
                <label>Tahun mula
                  <input type="number" min={1950} max={2100}
                    value={eduForm.start_year}
                    onChange={(e) => setEduForm({ ...eduForm, start_year: e.target.value })} />
                </label>
                <label>Tahun tamat
                  <input type="number" min={1950} max={2100}
                    value={eduForm.end_year}
                    onChange={(e) => setEduForm({ ...eduForm, end_year: e.target.value })} />
                </label>
              </div>
              <label>Penerangan
                <textarea rows={4} maxLength={2000}
                  value={eduForm.description}
                  onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })} />
              </label>
            </>
          ) : (
            <>
              <label>Nama syarikat / organisasi
                <input required maxLength={180} value={workForm.company}
                  onChange={(e) => setWorkForm({ ...workForm, company: e.target.value })} />
              </label>
              <label>Jawatan
                <input required maxLength={180} value={workForm.role}
                  onChange={(e) => setWorkForm({ ...workForm, role: e.target.value })} />
              </label>
              <div className="tf-formgrid">
                <label>Tarikh mula
                  <input type="date" value={workForm.start_date}
                    onChange={(e) => setWorkForm({ ...workForm, start_date: e.target.value })} />
                </label>
                <label>Tarikh tamat (kosong jika masih bekerja)
                  <input type="date" value={workForm.end_date}
                    onChange={(e) => setWorkForm({ ...workForm, end_date: e.target.value })} />
                </label>
              </div>
              <label>Tanggungjawab / hasil kerja
                <textarea rows={5} maxLength={3000}
                  value={workForm.description}
                  onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })} />
              </label>
            </>
          )}

          <div className="tf-form-actions">
            <button className="tf-btn" type="submit" disabled={busy}>
              {editingId ? <Pencil size={15} /> : <Plus size={15} />}
              {busy ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Rekod"}
            </button>
            {editingId && (
              <button type="button" className="tf-btn tf-btn-outline"
                disabled={busy} onClick={clearForm}>
                <X size={15} /> Batal Edit
              </button>
            )}
          </div>
          {message && <p className="tf-hint" role="status">{message}</p>}
          {errorMessage && <p className="tf-auth-error" role="alert">{errorMessage}</p>}
          {undoRecord && (
            <button type="button" className="tf-btn tf-btn-outline"
              disabled={busy} onClick={() => void undoDeletion()}>
              <Undo2 size={15} /> Buat Asal Padam (6 saat)
            </button>
          )}
        </form>

        <section className="tf-card tf-section">
          <div className="tf-card-head">
            <h3>{isEducation ? "Pendidikan Saya" : "Garis Masa Kerjaya"}</h3>
            <span className="tf-pill">DATA PERIBADI</span>
          </div>
          {items.length === 0 ? (
            <div className="tf-empty">
              <Icon size={27} />
              <b>Tiada rekod lagi</b>
              <p>Tambah rekod pertama menggunakan borang di sebelah.</p>
            </div>
          ) : (
            isEducation ? education.map((item) => (
              <div className="tf-listrow" key={item.id}>
                <div className="tf-list-icon"><Award size={19} /></div>
                <div>
                  <b>{item.qualification}</b>
                  <p>{item.institution}{item.field_of_study ? " · " + item.field_of_study : ""}</p>
                  <small>{item.start_year ?? "—"} – {item.end_year ?? "Kini"}</small>
                  {item.description && <p>{item.description}</p>}
                </div>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Edit ${item.qualification}`}
                  onClick={() => beginEdit(item)}>
                  <Pencil size={17} />
                </button>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Padam ${item.qualification}`}
                  onClick={() => setPendingDeletion({ kind: "education", record: item })}>
                  <Trash2 size={17} />
                </button>
              </div>
            )) : experience.map((item) => (
              <div className="tf-listrow" key={item.id}>
                <div className="tf-list-icon"><BriefcaseBusiness size={19} /></div>
                <div>
                  <b>{item.role}</b>
                  <p>{item.company}</p>
                  <small>{item.start_date ?? "—"} – {item.end_date ?? "Kini"}</small>
                  {item.description && <p>{item.description}</p>}
                </div>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Edit ${item.role}`}
                  onClick={() => beginEdit(item)}>
                  <Pencil size={17} />
                </button>
                <button type="button" className="tf-iconbutton" disabled={busy}
                  aria-label={`Padam ${item.role}`}
                  onClick={() => setPendingDeletion({ kind: "experience", record: item })}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingDeletion !== null}
        title="Padam rekod ini?"
        description={
          pendingDeletion?.kind === "education"
            ? "Rekod pendidikan akan dipadam. Anda boleh membatalkannya dalam 6 saat."
            : "Rekod pekerjaan akan dipadam. Anda boleh membatalkannya dalam 6 saat."
        }
        confirmLabel="Padam Rekod"
        danger
        busy={busy}
        onClose={() => setPendingDeletion(null)}
        onConfirm={() => void deleteConfirmed()}
      />
    </>
  );
}
