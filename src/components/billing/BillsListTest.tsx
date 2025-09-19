import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BillsListTest: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bills List Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Component</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This is a test component to verify basic functionality.</p>
          <Button>Test Button</Button>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800">Debug Info:</h3>
        <ul className="mt-2 text-sm text-blue-700">
          <li>✅ React imports working</li>
          <li>✅ Card components working</li>
          <li>✅ Button component working</li>
          <li>✅ Tailwind CSS classes working</li>
        </ul>
      </div>
    </div>
  );
};

export default BillsListTest;