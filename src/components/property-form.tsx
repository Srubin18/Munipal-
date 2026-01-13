'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    accountNumber: '',
    streetAddress: '',
    suburb: '',
    postalCode: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add property');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="accountNumber">CoJ Account Number</Label>
        <Input
          id="accountNumber"
          placeholder="13-digit account number"
          value={formData.accountNumber}
          onChange={(e) =>
            setFormData({ ...formData, accountNumber: e.target.value })
          }
          required
        />
        <p className="text-xs text-gray-500">
          Found on your municipal statement
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="streetAddress">Street Address</Label>
        <Input
          id="streetAddress"
          placeholder="123 Main Road"
          value={formData.streetAddress}
          onChange={(e) =>
            setFormData({ ...formData, streetAddress: e.target.value })
          }
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suburb">Suburb</Label>
          <Input
            id="suburb"
            placeholder="Sandton"
            value={formData.suburb}
            onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            placeholder="2196"
            value={formData.postalCode}
            onChange={(e) =>
              setFormData({ ...formData, postalCode: e.target.value })
            }
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Adding property...' : 'Add Property'}
      </Button>
    </form>
  );
}
