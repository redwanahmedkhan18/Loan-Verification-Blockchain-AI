import { useEffect, useState } from "react";
import { Container, Paper, Typography } from "@mui/material";
import { listApplications } from "../api/loans";

export default function Applications() {
  const [apps, setApps] = useState([]);
  useEffect(() => { (async()=> setApps(await listApplications("all") || []))(); }, []);
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>All Applications</Typography>
      {apps.map(a=>(
        <Paper key={a.id} sx={{ p: 2, mb: 1 }}>
          <Typography>#{a.id} — {a.status} — {a.amount}</Typography>
        </Paper>
      ))}
    </Container>
  );
}
