import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { logout } from "@/services/operations/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Video,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  MessageSquare,
  Settings,
  LogOut,
  FilePlus,
  FileText,
  PillBottle,
  ClipboardList,
  UserCog,
  Receipt,
  X,
  Activity,
  Bed,
  Pill,
  Stethoscope,
  FileSignature,
  CreditCard,
  DollarSign,
  AlertCircle,
  BarChart3,
  Shield,
  Award,
  Send,
  Bell,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const navItems = [
    { name: "Dashboard", path: "/provider/dashboard", icon: LayoutDashboard },
    { name: "Patients", path: "/provider/patients", icon: Users },
    { name: "Appointments", path: "/provider/appointments", icon: Calendar },
    { name: "Encounters", path: "/provider/encounters", icon: Stethoscope },
    { name: "Telehealth", path: "/provider/telehealth", icon: Video },
    {
      name: "Patient Monitoring",
      path: "/provider/patient-monitoring",
      icon: Activity,
    },
    { name: "Messages", path: "/provider/messages", icon: MessageSquare },
  ];

  const billingItems = [
    { name: "Billing", path: "/provider/billing", icon: Receipt },
    { 
      name: "RCM Management", 
      path: "/provider/rcm", 
      icon: CreditCard,
      badge: "Enhanced"
    },
  ];

  const rcmSubItems = [
    { name: "RCM Dashboard", path: "/provider/rcm", icon: LayoutDashboard },
    { name: "Denials", path: "/provider/rcm/denials", icon: AlertCircle },
    { name: "Collections", path: "/provider/rcm/collections", icon: DollarSign },
    { name: "Analytics", path: "/provider/rcm/analytics", icon: Activity },
  ];

  const analyticsItems = [
    { name: "Analytics", path: "/provider/analytics", icon: Activity },
    { name: "Reports", path: "/provider/reports", icon: FileText },
  ];

  const careManagementItems = [
    { name: "CCM", path: "/provider/ccm", icon: HeartPulse },
    { name: "PCM", path: "/provider/pcm", icon: UserCog },
    { name: "RPM", path: "/provider/rpm", icon: Activity },
  ];

  const clinicalItems = [
    { name: "Medications", path: "/provider/medications", icon: Pill },
    { name: "Patient Intake", path: "/provider/intake", icon: ClipboardList },
    { name: "Patient Beds", path: "/provider/patient-beds", icon: Bed },
    {
      name: "Patient Consents",
      path: "/provider/patient-consent",
      icon: FileSignature,
    },
  ];

  const managementItems = [
    { 
      name: "Services", 
      path: "/provider/services", 
      icon: Wrench,
      badge: "New"
    },
  ];

  const communicationItems = [
    { 
      name: "Patient Outreach", 
      path: "/provider/patient-outreach", 
      icon: Send,
      badge: "New"
    },
    { 
      name: "Communication Analytics", 
      path: "/provider/patient-outreach/analytics", 
      icon: BarChart3 
    },
  ];

  const complianceItems = [
    { 
      name: "MIPS Compliance", 
      path: "/provider/mips", 
      icon: Award,
      badge: "New"
    },
  ];

  const settingsItems = [
    {
      name: "Doctor Settings",
      path: "/provider/doctor-settings",
      icon: UserCog,
    },
    { name: "Settings", path: "/provider/settings", icon: Settings },
  ];

  const handleBackdropClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  // Handle navigation item click
  const handleNavClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  useEffect(() => {
    console.log(open);
    console.log(isMobile);
  }, [useIsMobile, open]);

  // Handle logout using Redux
  const handleLogout = () => {
    dispatch(logout(navigate) as any);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar shadow-lg transition-all transform duration-300 ease-in-out max-h-[calc(100vh-56px)]",
          isMobile
            ? open
              ? "fixed inset-y-0 left-0 z-40 w-[85%] max-w-[300px] translate-x-0 bg-white"
              : "fixed inset-y-0 left-0 z-40 w-0 -translate-x-full"
            : open
            ? "relative z-10 w-64"
            : "relative z-10 w-14"
        )}
      >
        {/* Mobile close button */}
        {isMobile && open && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-50 h-8 w-8 rounded-full"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        )}

        {/* Desktop toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-0 top-20 h-6 w-6 rounded-full -mr-3 border border-border hidden sm:flex",
            "hover:bg-primary hover:text-primary-foreground"
          )}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="sr-only">{open ? "Close" : "Open"} sidebar</span>
        </Button>

        {/* Header */}
        <div className="flex h-14 items-center border-b px-4">
          {open && (
            <div className="flex items-center gap-2 transition-opacity duration-300">
              <FilePlus className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">Ovhi_Patient Portal</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4 max-h-[calc(100vh-130px)]">
          <nav className="grid gap-1 px-2">
            {/* Core Navigation */}
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && <span className="text-base">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Billing & RCM Section */}
          <nav className="grid gap-1 px-2">
            {open && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Revenue Cycle
              </div>
            )}
            {billingItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">{item.name}</span>
                    {item.badge && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
            
            {/* RCM Sub-items (show when RCM is active) */}
            {open && location.pathname.startsWith('/provider/rcm') && (
              <div className="ml-4 space-y-1">
                {rcmSubItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all",
                      "hover:bg-accent hover:text-accent-foreground",
                      location.pathname === item.path
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Analytics Section */}
          <nav className="grid gap-1 px-2">
            {open && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Analytics
              </div>
            )}
            {analyticsItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && <span className="text-base">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Care Management Section */}
          <nav className="grid gap-1 px-2">
            {open && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Care Management
              </div>
            )}
            {careManagementItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && <span className="text-base">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Clinical Tools Section */}
          <nav className="grid gap-1 px-2">
            {open && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Clinical Tools
              </div>
            )}
            {clinicalItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && <span className="text-base">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Patient Communication Section */}
          <nav className="grid gap-1 px-2">
            {open && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Patient Communication
              </div>
            )}
            {communicationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">{item.name}</span>
                    {item.badge && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Compliance Section */}
          <nav className="grid gap-1 px-2">
            {open && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Compliance
              </div>
            )}
            {complianceItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">{item.name}</span>
                    {item.badge && (
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Management Section */}
          <nav className="grid gap-1 px-2">
            {open && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Management
              </div>
            )}
            {managementItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">{item.name}</span>
                    {item.badge && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </nav>

          {open && <Separator className="my-4 mx-2" />}

          {/* Settings Section */}
          <div className="grid gap-1 px-2">
            {settingsItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground font-medium"
                    : "",
                  !open && "justify-center"
                )}
                onClick={handleNavClick}
              >
                <item.icon className={cn("h-5 w-5", !open && "h-6 w-6")} />
                {open && <span className="text-base">{item.name}</span>}
              </Link>
            ))}

            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground justify-start",
                "hover:bg-accent hover:text-accent-foreground text-base",
                !open && "justify-center"
              )}
              onClick={handleLogout}
            >
              <LogOut className={cn("h-5 w-5", !open && "h-6 w-6")} />
              {open && <span>Log out</span>}
            </Button>
          </div>
        </ScrollArea>

        {open && (
          <div className="mt-auto p-4 border-t">
            <div className="flex items-center gap-3 rounded-md bg-accent/50 p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <HeartPulse className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">Premium Support</span>
                <span className="text-xs text-muted-foreground">
                  Access 24/7 support
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
