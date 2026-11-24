"use client";
import {useEffect} from "react";
export default function ThemeInitializer(){
 useEffect(()=>{try{document.documentElement.classList.toggle("tf-dark",localStorage.getItem("tf-dark")==="true");}catch{}},[]);
 return null;
}
