import { useState } from "react";
import { Alert, Box, Button, Container, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { api, handleError } from "../api/client";

export default function KycUpload() {
  const [docType, setDocType] = useState("ID");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault(); setMsg("");
    try {
      const fd = new FormData();
      fd.append("doc_type", docType);
      fd.append("file", file);
      const { data } = await api.post("/kyc/upload", fd, { headers: { "Content-Type": "multipart/form-data" }});
      setMsg(`Uploaded: ${data?.id || "OK"}`);
    } catch (e) {
      handleError(e);
    }
  }

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800}>Upload KYC Document</Typography>
        {msg && <Alert severity="success" sx={{ my: 2 }}>{msg}</Alert>}
        <Box component="form" onSubmit={submit} sx={{ mt: 2, display: "grid", gap: 2 }}>
          <TextField select label="Document Type" value={docType} onChange={e=>setDocType(e.target.value)}>
            {["ID","IncomeProof","Collateral","Other"].map(d=> <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          <Button variant="outlined" component="label">
            Choose File
            <input type="file" hidden onChange={e=>setFile(e.target.files?.[0])} />
          </Button>
          <Button type="submit" variant="contained" disabled={!file}>Upload</Button>
        </Box>
      </Paper>
    </Container>
  );
}
