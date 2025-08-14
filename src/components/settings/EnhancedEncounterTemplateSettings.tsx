import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  Plus,
  Search,
  Filter,
  Star,
  Users,
  Clock,
  Sparkles,
  Brain,
  Wand2,
  Eye,
  Edit,
  Copy,
  Trash,
  TrendingUp,
  BarChart,
  Settings,
  FileText,
  Stethoscope
} from 'lucide-react';

// Import the new smart template components
import SmartTemplateSelector from '../encounters/SmartTemplateSelector';
import SmartTemplateBuilder from '../encounters/SmartTemplateBuilder';

// Import API functions
import {
  getTemplatesBySpecialtyAPI,
  cloneTemplateAPI,
  rateTemplateAPI,
  getTemplateAnalyticsAPI
} from '@/services/operations/smartTemplates';

interface Template {
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
  created_at: string;
  updated_at: string;
}

const EnhancedEncounterTemplateSettings: React.FC = () => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedVisitType, setSelectedVisitType] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [activeTab, setActiveTab] = useState('my-templates');
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateAnalytics, setTemplateAnalytics] = useState<any>({});

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = {
        specialty: selectedSpecialty,
        visitType: selectedVisitType,
        searchTerm,
        sortBy
      };
      
      const response = await getTemplatesBySpecialtyAPI(token, params);
      if (response?.data) {
        setTemplates(response.data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's templates
  const getUserTemplates = () => {
    return templates.filter(template => template.is_mine);
  };

  // Get public templates
  const getPublicTemplates = () => {
    return templates.filter(template => !template.is_mine);
  };

  // Get AI-enhanced templates
  const getAITemplates = () => {
    return templates.filter(template => template.ai_enhanced);
  };

  // Handle template selection from smart selector
  const handleTemplateSelect = (template: Template) => {
    setEditingTemplate(template);
    setShowSelector(false);
    setShowBuilder(true);
  };

  // Handle template save from builder
  const handleTemplateSave = (templateData: any) => {
    setShowBuilder(false);
    setEditingTemplate(null);
    fetchTemplates(); // Refresh templates
    toast.success('Template saved successfully');
  };

  // Handle template clone
  const handleCloneTemplate = async (templateId: string) => {
    const response = await cloneTemplateAPI(token, templateId, {});
    if (response) {
      fetchTemplates(); // Refresh templates
    }
  };

  // Handle template rating
  const handleRateTemplate = async (templateId: string, rating: number) => {
    const response = await rateTemplateAPI(token, templateId, {
      rating,
      usageContext: {
        specialty: selectedSpecialty,
        visitType: selectedVisitType
      }
    });
    if (response) {
      fetchTemplates(); // Refresh to show updated rating
    }
  };

  // Get template analytics
  const fetchTemplateAnalytics = async (templateId: string) => {
    const response = await getTemplateAnalyticsAPI(token, templateId);
    if (response?.data) {
      setTemplateAnalytics(prev => ({
        ...prev,
        [templateId]: response.data
      }));
    }
  };

  useEffect(() => {
    if (token) {
      fetchTemplates();
    }
  }, [token, selectedSpecialty, selectedVisitType, searchTerm, sortBy]);

  const TemplateCard: React.FC<{ template: Template }> = ({ template }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{template.template_name}</h3>
              {template.ai_enhanced && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
              {template.is_mine && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Mine
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                  {template.usage_count}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingTemplate(template);
                setShowBuilder(true);
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCloneTemplate(template.id)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Clone
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchTemplateAnalytics(template.id)}
            >
              <BarChart className="h-3 w-3 mr-1" />
              Analytics
            </Button>
          </div>
          
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
        </div>
      </CardContent>
    </Card>
  );

  const AnalyticsCard: React.FC<{ templateId: string }> = ({ templateId }) => {
    const analytics = templateAnalytics[templateId];
    if (!analytics) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Template Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold">{analytics.usageStats?.total_uses || 0}</div>
              <div className="text-muted-foreground">Total Uses</div>
            </div>
            <div>
              <div className="font-semibold">{analytics.usageStats?.unique_users || 0}</div>
              <div className="text-muted-foreground">Unique Users</div>
            </div>
            <div>
              <div className="font-semibold">
                {analytics.usageStats?.avg_rating ? analytics.usageStats.avg_rating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-muted-foreground">Avg Rating</div>
            </div>
            <div>
              <div className="font-semibold">
                {analytics.usageStats?.last_used ? 
                  new Date(analytics.usageStats.last_used).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-muted-foreground">Last Used</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (showBuilder) {
    return (
      <SmartTemplateBuilder
        initialTemplate={editingTemplate}
        onSave={handleTemplateSave}
        onCancel={() => {
          setShowBuilder(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  if (showSelector) {
    return (
      <SmartTemplateSelector
        onTemplateSelect={handleTemplateSelect}
        currentSpecialty={user?.specialty}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            Smart Encounter Templates
          </h2>
          <p className="text-muted-foreground">
            AI-powered templates that adapt to your practice and specialty
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSelector(true)}
          >
            <Search className="h-4 w-4 mr-2" />
            Smart Selector
          </Button>
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Filters */}
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
          <TabsTrigger value="my-templates" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Templates
          </TabsTrigger>
          <TabsTrigger value="public-templates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Public Templates
          </TabsTrigger>
          <TabsTrigger value="ai-templates" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Enhanced
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Templates</h3>
            <Badge variant="secondary">{getUserTemplates().length} templates</Badge>
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
              {getUserTemplates().map((template) => (
                <div key={template.id}>
                  <TemplateCard template={template} />
                  <AnalyticsCard templateId={template.id} />
                </div>
              ))}
              {getUserTemplates().length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No templates created yet. Create your first template to get started.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public-templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Public Templates</h3>
            <Badge variant="secondary">{getPublicTemplates().length} templates</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getPublicTemplates().map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
            {getPublicTemplates().length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No public templates available.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ai-templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">AI Enhanced Templates</h3>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              <Sparkles className="h-3 w-3 mr-1" />
              {getAITemplates().length} templates
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getAITemplates().map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
            {getAITemplates().length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No AI-enhanced templates available. Create one with AI assistance.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <div className="text-sm text-muted-foreground">
                  {getUserTemplates().length} yours, {getPublicTemplates().length} public
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AI Enhanced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getAITemplates().length}</div>
                <div className="text-sm text-muted-foreground">
                  {((getAITemplates().length / templates.length) * 100).toFixed(0)}% of all templates
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Most Used Specialty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {templates.length > 0 ? 
                    templates.reduce((prev, current) => 
                      templates.filter(t => t.specialty === current.specialty).length > 
                      templates.filter(t => t.specialty === prev.specialty).length ? current : prev
                    ).specialty : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Primary specialty</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedEncounterTemplateSettings;