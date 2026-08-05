type Lead = {
  id: string;
  businessName: string;
  niche: string;
  country: string;
  status: string;
};

export default function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th>Business</th>
          <th>Niche</th>
          <th>Country</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {leads.map((lead) => (
          <tr key={lead.id}>
            <td>{lead.businessName}</td>
            <td>{lead.niche}</td>
            <td>{lead.country}</td>
            <td>{lead.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
