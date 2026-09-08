export const jar=new Map();
export const options=new Map();
export async function cookies(){return{get:name=>jar.has(name)?{value:jar.get(name)}:undefined,set:(name,value,opts)=>{jar.set(name,value);options.set(name,opts)}}}
export async function headers(){return new Headers()}
