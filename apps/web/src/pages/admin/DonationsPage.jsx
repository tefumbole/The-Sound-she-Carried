import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Table } from './DashboardPage';

export default function DonationsPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/donations').then(setRows); }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">Donations</h1>
      <Table rows={rows} />
    </div>
  );
}
