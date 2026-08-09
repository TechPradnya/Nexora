export function StatusBadge({status}:{status:string}){return <span className={`status status-${status.toLowerCase().replace(/\s/g,'-')}`}><i/>{status}</span>}
