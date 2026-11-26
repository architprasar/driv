"use client";
import {Suspense} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
function Destination({href,children}:{href:string;children:React.ReactNode}){const params=useSearchParams();const next=params.get("next");return <Link className="font-bold text-primary" href={next?`${href}?next=${encodeURIComponent(next)}`:href}>{children}</Link>;}
export default function AuthSwitchLink(props:{href:string;children:React.ReactNode}){return <Suspense fallback={<Link className="font-bold text-primary" href={props.href}>{props.children}</Link>}><Destination {...props}/></Suspense>;}
