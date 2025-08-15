import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp,
  FileText,
  User,
  Calendar,
  Shield
} from 'lucide-react';
import { validateClaimAPI, getClaimSuggestionsAPI } from '@/services/operations/rcm';

interface ValidationResult {
  score: number;
  maxScore: number;
  approvalProbability: number;
  issues: Array<{
    type: string;
    field: string;
    message: string;
    severity: string;
  }>;
  suggestions: Array<{
    type: string;
    field: string;
    message: string;
    action: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
}

interface ClaimValidationProps {
  claimId: number;
  onValidationComplete?: (result: ValidationResult) => void;
}

const ClaimValidation: React.FC<ClaimValidationProps> = ({ 
  claimId, 
  onValidationComplete 
}) => {
  const { token } = useSelector((state: any) => state.auth);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);

  const validateClaim = async () => {
    try {
      setLoading(true);
      const response = await validateClaimAPI(token, claimId);
      
      if (response.success) {
        setValidationResult(response.data.validation);
        onValidationComplete?.(response.data.validation);
        
        // Get suggestions for the patient
        if (response.data.claim.patient_id) {
          const suggestionsResponse = await getClaimSuggestionsAPI(token, response.data.claim.patient_id);
          if (suggestionsResponse.success) {
            setSuggestions(suggestionsResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('Error validating claim:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (claimId) {
      validateClaim();
    }
  }, [claimId]);

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'bg-green-100';
    if (percentage >= 75) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Validating claim...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Click validate to check claim quality</p>
            <Button onClick={validateClaim} className="mt-4">
              <Shield className="h-4 w-4 mr-2" />
              Validate Claim
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Claim Quality Score
          </CardTitle>
          <CardDescription>
            Overall assessment of claim completeness and accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className={`text-4xl font-bold ${getScoreColor(validationResult.score, validationResult.maxScore)}`}>
              {validationResult.score}/{validationResult.maxScore}
            </div>
            <div className={`px-4 py-2 rounded-lg ${getScoreBackground(validationResult.score, validationResult.maxScore)}`}>
              <div className="text-sm font-medium">Approval Probability</div>
              <div className={`text-2xl font-bold ${getScoreColor(validationResult.score, validationResult.maxScore)}`}>
                {validationResult.approvalProbability}%
              </div>
            </div>
          </div>
          
          <Progress 
            value={(validationResult.score / validationResult.maxScore) * 100} 
            className="mb-4"
          />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {validationResult.maxScore - validationResult.issues.length}
              </div>
              <div className="text-sm text-gray-600">Checks Passed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {validationResult.suggestions.length}
              </div>
              <div className="text-sm text-gray-600">Suggestions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {validationResult.issues.length}
              </div>
              <div className="text-sm text-gray-600">Issues Found</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {validationResult.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Issues Found ({validationResult.issues.length})
            </CardTitle>
            <CardDescription>
              Problems that may cause claim denial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResult.issues.map((issue, index) => (
                <div key={index} className={`p-3 border rounded-lg ${getSeverityColor(issue.severity)}`}>
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="font-medium capitalize">{issue.field.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-700">{issue.message}</div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {issue.severity} priority
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {validationResult.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Improvement Suggestions ({validationResult.suggestions.length})
            </CardTitle>
            <CardDescription>
              Recommendations to improve claim quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResult.suggestions.map((suggestion, index) => (
                <div key={index} className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium capitalize">{suggestion.field.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-700">{suggestion.message}</div>
                      <Badge variant="outline" className="mt-1 text-xs bg-white">
                        {suggestion.type}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline">
                      Apply Fix
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {validationResult.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResult.warnings.map((warning, index) => (
                <Alert key={index} className={warning.type === 'error' ? 'border-red-500' : warning.type === 'success' ? 'border-green-500' : 'border-yellow-500'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {warning.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claim Suggestions */}
      {suggestions && suggestions.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Recommended Services
            </CardTitle>
            <CardDescription>
              Based on patient diagnosis and history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.suggestions.map((suggestion: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">
                      {suggestion.diagnosis} - {suggestion.diagnosis_description}
                    </div>
                    <Badge variant="outline">
                      {suggestion.confidence}% confidence
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {suggestion.recommended_cpts.map((cpt: any, cptIndex: number) => (
                      <div key={cptIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{cpt.code} - {cpt.description}</div>
                          <div className="text-sm text-gray-600">{cpt.reason}</div>
                        </div>
                        <Button size="sm" variant="outline">
                          Add to Claim
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last validated: {new Date().toLocaleString()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={validateClaim}>
                Re-validate
              </Button>
              <Button>
                Submit Claim
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimValidation;