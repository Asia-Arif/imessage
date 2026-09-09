// const express=require("express")
import express from "express"
import User from "./models/user.model.js"
import "dotenv/config"
import { connectDB } from "./lib/db.js"
const app=express()
const PORT=process.env.PORT
app.get("/health",(req,res)=>{
    res.status(200).json({ok:true})
})
app.listen(PORT,()=>{
    connectDB()
    console.log("server is running on  PORT:",PORT)
})