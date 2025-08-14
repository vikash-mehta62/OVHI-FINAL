import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  Search,
  Star,
  Clock,
  Users,
  Sparkles,
  Copy,
  Eye,
  Filter,
  TrendingUp,
  Brain,
  Stethoscope,
  FileText,
  Plus,
  Heart,
  Zap
} from 'lucide-react';

interface SmartTemplate {
  id: string;
  template_name: string;
  specialty: string;
  visit_type: string;
  soap_structure: any;
  billing_codes: any;
  usage_count: number;
  avg_rating: number;
  is_mine: boolean;
  ai_enhanced: boolean;
  tags: string[];
  creator_name?: string;
  last_used?: string;
}

interface SmartTemplateSelectorProps {
  onTemplateSelect: (template: SmartTemplate) => void;
  currentSpecialty?: string;
  currentVisitType?: string;
  chiefComplaint?: string;
  patientAge?: number;
  patientGender?: string;
}

const SmartTemplateSelector: React.FC<SmartTemplateSelectorProps> = ({
  onTemplateSelect,
  currentSpecialty,
  currentVisitType,
  chiefComplaint,
  patientAge,
  patientGender
}) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [templates, setTemplates] = useState<SmartTemplate[]>([]);
  const [recommendedTemplates, setRecommendedTemplates] = useState<SmartTemplate[]>([]);
  const [frequentTemplates, setFrequentTemplates] = useState<SmartTemplate[]>([]);
  const [contentSuggestions, setContentSuggestions] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(currentSpecialty || 'all');
  const [selectedVisitType, setSelectedVisitType] = useState(currentVisitType || 'all');
  const [sortBy, setSortBy] = useState('relevance');
  const [activeTab, setActiveTab] = useState('recommended');

  // Fetch smart recommendations
  const fetchSmartRecommendations = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        specialty: currentSpecialty || '',
        visitType: currentVisitType || '',
        chiefComplaint: chiefComplaint || '',
        patientAge: patientAge?.toString() || '',
        patientGender: patientGender || ''
      });

      const response = await fetch(`/api/v1/encounters/smart-templates/recommendations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendedTemplates(data.data.recommendedTemplates || []);
        setFrequentTemplates(data.data.frequentTemplates || []);
        setContentSuggestions(data.data.contentSuggestions || {});
      }
    } catch (error) {
      console.error('Error fetching smart recommendations:', error);
      toast.error('Failed to load smart recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates by specialty
  const fetchTemplatesBySpecialty = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        specialty: selectedSpecialty,
        visitType: selectedVisitType,
        searchTerm,
        sortBy
      });

      const response = await fetch(`/api/v1/encounters/smart-templates/specialty?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Clone template
  const handleCloneTemplate = async (templateId: string, newName?: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/v1/encounters/smart-templates/${templateId}/clone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newName: newName || undefined,
          customizations: {}
        })
      });

      if (response.ok) {
        toast.success('Template cloned successfully');
        fetchTemplatesBySpecialty(); // Refresh templates
      } else {
        toast.error('Failed to clone template');
      }
    } catch (error) {
      console.error('Error cloning template:', error);
      toast.error('Failed to clone template');
    }
  };

  // Rate template
  const handleRateTemplate = async (templateId: string, rating: number) => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/v1/encounters/smart-templates/${templateId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          usageContext: {
            specialty: currentSpecialty,
            visitType: currentVisitType,
            chiefComplaint
          }
        })
      });

      if (response.ok) {
        toast.success('Template rated successfully');
        fetchTemplatesBySpecialty(); // Refresh to show updated rating
      }
    } catch (error) {
      console.error('Error rating template:', error);
      toast.error('Failed to rate template');
    }
  };

  useEffect(() => {
    fetchSmartRecommendations();
  }, [currentSpecialty, currentVisitType, chiefComplaint]);

  useEffect(() => {
    fetchTemplatesBySpecialty();
  }, [selectedSpecialty, selectedVisitType, searchTerm, sortBy]);

  const TemplateCard: React.FC<{ template: SmartTemplate; showActions?: boolean }> = ({ 
    template, 
    showActions = true 
  }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {template.template_name}
              {template.ai_enhanced && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
              {template.is_mine && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Mine
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                {template.specialty}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {template.visit_type}
              </span>
              {template.usage_count > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {template.usage_count} uses
                </span>
              )}
              {template.avg_rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {template.avg_rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onTemplateSelect(template)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Eye className="h-3 w-3 mr-1" />
              Use Template
            </Button>
            {showActions && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCloneTemplate(template.id)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Clone
              </Button>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRateTemplate(template.id, star)}
                  className="text-gray-300 hover:text-yellow-400 transition-colors"
                >
                  <Star 
                    className={`h-3 w-3 ${
                      star <= template.avg_rating ? 'fill-yellow-400 text-yellow-400' : ''
                    }`} 
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const ContentSuggestionsCard: React.FC = () => (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Brain className="h-5 w-5" />
          AI Content Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(contentSuggestions).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(contentSuggestions).map(([section, suggestions]: [string, any]) => (
              <div key={section}>
                <h4 className="font-medium text-purple-700 capitalize mb-2">{section}</h4>
                <ul className="space-y-1">
                  {suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                    <li key={index} className="text-sm text-purple-600 flex items-start gap-2">
                      <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-purple-600 text-sm">
            Add a chief complaint to get AI-powered content suggestions
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Smart Insights */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Smart Template Selector
          </h2>
          <p className="text-muted-foreground">
            AI-powered template recommendations based on your practice and patient context
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                <SelectItem value="Primary Care">Primary Care</SelectItem>
                <SelectItem value="Cardiology">Cardiology</SelectItem>
                <SelectItem value="Mental Health">Mental Health</SelectItem>
                <SelectItem value="Neurology">Neurology</SelectItem>
                <SelectItem value="Urgent Care">Urgent Care</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedVisitType} onValueChange={setSelectedVisitType}>
              <SelectTrigger>
                <SelectValue placeholder="All Visit Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visit Types</SelectItem>
                <SelectItem value="New Patient">New Patient</SelectItem>
                <SelectItem value="Established Patient">Established Patient</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
                <SelectItem value="Annual/Preventive">Annual/Preventive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="popular">Most Used</SelectItem>
                <SelectItem value="recent">Recently Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Template Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recommended
          </TabsTrigger>
          <TabsTrigger value="frequent" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Frequently Used
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Templates
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommended" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Smart Recommendations</h3>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              Based on your specialty and patient context
            </Badge>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
              {recommendedTemplates.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recommendations available. Try adjusting your specialty or visit type.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="frequent" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Your Frequently Used Templates</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frequentTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
            {frequentTemplates.length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No frequently used templates yet. Start using templates to see them here.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
            {templates.length === 0 && !loading && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No templates found. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <ContentSuggestionsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartTemplateSelector;