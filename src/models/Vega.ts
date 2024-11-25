// src/models/Vega.ts
import mongoose from "mongoose";

const vegaSchema = new mongoose.Schema({
  data: { type: Object },
});

export const Vega = mongoose.model("Vega", vegaSchema);
