import { createContext, useContext, useState, type ReactNode } from 'react';
import { items, type Item } from './kept-data';

export type ClaimStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed';
export type Claim = { id: string; itemId: string; person: string; direction: 'Sent' | 'Received'; status: ClaimStatus; answers: string[] };
type KeptState = {
  reports: Item[]; addReport: (item: Item) => void;
  claims: Claim[]; addClaim: (itemId: string, answers: string[]) => void; updateClaim: (id:string,status:ClaimStatus) => void;
  messages: {text:string; mine:boolean}[]; sendMessage: (text:string) => void;
  handedOver: boolean; received: boolean; confirm: (kind:'handedOver'|'received') => void;
  rating: number; review: string; saveRating:(rating:number,review:string)=>void;
  signedIn:boolean; setSignedIn:(value:boolean)=>void;
};
const KeptContext = createContext<KeptState | null>(null);
export function KeptProvider({children}:{children:ReactNode}) {
  const [reports,setReports] = useState(items);
  const [claims,setClaims] = useState<Claim[]>([
    {id:'claim-1',itemId:'hoodie',person:'Ananya Sharma',direction:'Sent',status:'Accepted',answers:['Small stitched initials inside','M','Grey drawstrings']},
    {id:'claim-2',itemId:'bottle',person:'Rohan Mehta',direction:'Received',status:'Pending',answers:['A small dent on the base','750 ml','Black loop cap']},
    {id:'claim-3',itemId:'airpods',person:'Isha Rao',direction:'Sent',status:'Rejected',answers:['White case','No engraving','Second generation']},
    {id:'claim-4',itemId:'key',person:'Dev Singh',direction:'Sent',status:'Cancelled',answers:[]},
    {id:'claim-5',itemId:'id-card',person:'Meera Patel',direction:'Received',status:'Completed',answers:['Purple lanyard','Arts','Second year']},
  ]);
  const [messages,setMessages] = useState([{text:'Hey! Your answers match the hoodie I found. Pretty sure we found its person :)',mine:false},{text:'Amazing, thank you so much! I thought it was gone for good.',mine:true},{text:'No worries! Could we meet at the library help desk tomorrow?',mine:false}]);
  const [handedOver,setHandedOver]=useState(false); const [received,setReceived]=useState(false);
  const [rating,setRating]=useState(0); const [review,setReview]=useState(''); const [signedIn,setSignedIn]=useState(false);
  return <KeptContext.Provider value={{reports,addReport:item=>setReports(prev=>[item,...prev]),claims,addClaim:(itemId,answers)=>setClaims(prev=>[{id:`claim-${Date.now()}`,itemId,answers,person:'You',direction:'Sent',status:'Pending'},...prev]),updateClaim:(id,status)=>setClaims(prev=>prev.map(c=>c.id===id?{...c,status}:c)),messages,sendMessage:text=>setMessages(prev=>[...prev,{text,mine:true}]),handedOver,received,confirm:kind=>kind==='handedOver'?setHandedOver(true):setReceived(true),rating,review,saveRating:(r,text)=>{setRating(r);setReview(text)},signedIn,setSignedIn}}>{children}</KeptContext.Provider>;
}
export function useKept(){const context=useContext(KeptContext);if(!context)throw new Error('KeptProvider required');return context;}