import Link from 'next/link';
import { Card, CardContent, CardActions, Button, Grid, Typography, Stack } from '@mui/material';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  cta?: string;
  highlight?: boolean;
}

function FeatureCard({ title, description, href, cta = 'Open', highlight }: FeatureCardProps) {
  return (
    <Card elevation={highlight ? 4 : 1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 2, px: 2 }}>
        <Button component={Link} href={href} variant={highlight ? 'contained' : 'outlined'} size="small">{cta}</Button>
      </CardActions>
    </Card>
  );
}

export default function Home() {
  return (
    <Stack spacing={4} sx={{ p: { xs: 3, md: 6 } }}>
      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={700}>Report Copilot</Typography>
        <Typography variant="body1" color="text.secondary" maxWidth={680}>
          Explore operational data (customers, products, orders, bookings) and ask natural language questions. Queries are translated into safe, read-only MongoDB operations, returning tabular and chart-ready insights.
        </Typography>
      </Stack>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard title="Customers" description="View all registered customers with location tags." href="/customers" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard title="Products" description="Browse product catalog with categories and pricing." href="/products" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard title="Orders" description="Inspect recent orders and status distribution." href="/orders" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard title="Bookings" description="Analyze reservation data and pricing." href="/bookings" />
        </Grid>
        <Grid item xs={12} md={8}>
          <FeatureCard title="AI Report" description="Ask natural language questions; get instant tabular insights and chart suggestions." href="/ai-report" cta="Try it" highlight />
        </Grid>
      </Grid>
    </Stack>
  );
}
