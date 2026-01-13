'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      // TODO: Integrate Paystack for real payments
      // For MVP, simulate payment success
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: params.id,
          // Mock payment reference
          paymentRef: `PAY-${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      router.push(`/dashboard/cases/${params.id}`);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Complete Your Case
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span>Managed Dispute Case</span>
            <span>R 303.48</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>VAT (15%)</span>
            <span>R 45.52</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg">
            <span>Total</span>
            <span>R 349.00</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h3 className="font-medium text-blue-900">What&apos;s included:</h3>
            <ul className="mt-2 space-y-1 text-sm text-blue-800">
              <li>• AI-drafted dispute letter using verified facts</li>
              <li>• Submission to CoJ on your behalf</li>
              <li>• Reference number tracking</li>
              <li>• Up to 3 follow-ups over 60 days</li>
              <li>• Email updates on progress</li>
            </ul>
          </div>

          {/* MVP Payment Stub */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>MVP Note:</strong> This is a demo payment. No actual
              payment will be processed. Click below to simulate payment.
            </p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Processing...' : 'Pay R349.00'}
          </Button>

          <p className="text-xs text-center text-gray-500">
            By proceeding, you authorize MUNIPAL to submit a dispute to the City
            of Johannesburg on your behalf.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
