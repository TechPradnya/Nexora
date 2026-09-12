import type { RequestHandler } from 'express'; import { ZodError, type ZodType } from 'zod';
export const validate=(schema:ZodType):RequestHandler=>(req,res,next)=>{try{req.body=schema.parse(req.body);next();}catch(e){if(e instanceof ZodError)return res.status(400).json({message:'Validation failed',issues:e.issues});next(e);}};
