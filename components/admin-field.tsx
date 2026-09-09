'use client';
import {cloneElement, useId, type ReactElement} from 'react';
export function Field({label,children,hint}:{label:string;children:ReactElement<{id?:string;'aria-describedby'?:string}>;hint?:string}) {
 const generated=useId(); const id=children.props.id||generated;
 const description=[children.props['aria-describedby'],hint?id+'-hint':''].filter(Boolean).join(' ')||undefined;
 return <div className="admin-field"><label htmlFor={id}>{label}</label>{cloneElement(children,{id,'aria-describedby':description})}{hint&&<small id={id+'-hint'}>{hint}</small>}</div>;
}
