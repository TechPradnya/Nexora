import { Router } from 'express'; import { store } from '../services/store.js'; export const data=Router();
data.get('/agents',(_req,res)=>res.json({items:store.agents}));
data.get('/agents/:id',(req,res)=>{const item=store.agents.find(x=>x.id===req.params.id); if(!item)return res.status(404).json({message:'Agent not indexed'});res.json(item);});
data.get('/policies',(_req,res)=>res.json({items:store.policies}));
data.get('/escrows',(_req,res)=>res.json({items:store.escrows}));
data.get('/escrows/:id',(req,res)=>{const item=store.escrows.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({message:'Escrow not indexed'});res.json(item);});
data.get('/transactions',(_req,res)=>res.json({items:store.activity}));
