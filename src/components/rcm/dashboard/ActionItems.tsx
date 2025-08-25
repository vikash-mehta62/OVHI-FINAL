import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const ActionItems: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Items</CardTitle>
        <CardDescription>
          Recommended actions to improve performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Follow up on overdue claims</p>
              <p className="text-xs text-muted-foreground">
                15 claims are over 30 days old
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Review denied claims</p>
              <p className="text-xs text-muted-foreground">
                8 claims can be appealed
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Process ERA files</p>
              <p className="text-xs text-muted-foreground">
                2 new ERA files available
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionItems;