"use client"

import { MoreHorizontal, Trash2, Plus, ChevronRight, type LucideIcon, Layers, FolderOpen, List as ListIcon, Pencil, Loader2, Share2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState, ReactNode } from "react"
import URLS from "@/config/urls"
import { Folder, Forward, MoveRight, Copy, FileText } from "lucide-react"
import { usePathname } from "next/navigation"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { useToast } from "@/hooks/use-toast"
import { DuplicateListDrawer } from "@/components/sidebar-component/duplicate-list-drawer"
import { ListStatusesSheet } from "@/components/sidebar-component/list-statuses-sheet"
import { CustomFieldsSheet } from "@/components/sidebar-component/custom-fields-sheet"


type Project = {
  name: string
  _id: string
  url: string
  icon: LucideIcon
  subProjects?: Project[]
}

const transformSpaceData = (apiResponse: any) => {
  console.log('Raw API response for transformation:', apiResponse);
  
  const transformed = apiResponse.response.map((space: any) => {
    console.log('Processing space:', space.name, 'with ID:', space._id);
    console.log('Space folders:', space.folder);
    console.log('Space lists:', space.list);
    
    const result = {
      name: space.name,
      url: '', // Spaces themselves do not link to a detail page
      _id: space._id,
      icon: Layers, // Use Layers for Space
      subProjects: [
        // Folders inside space
        ...(space.folder?.map((folder: any) => {
          console.log('Processing folder:', folder.name, 'with ID:', folder._id);
          console.log('Folder lists:', folder.list);
          return {
            name: folder.name,
            url: '', // Folders themselves do not link to a detail page
            _id: folder._id,
            icon: FolderOpen, // Use FolderOpen for Folder
            subProjects: folder.list?.map((item: any) => ({
              name: item.name,
              url: `/list/${item._id}`,
              _id: item._id,
              icon: ListIcon // Use ListIcon for List
            })) || []
          };
        }) || []),
        // Lists directly under space
        ...(space.list?.map((item: any) => ({
          name: item.name,
          url: `/list/${item._id}`,
          _id: item._id,
          icon: ListIcon // Use ListIcon for List
        })) || [])
      ]
    };
    
    console.log('Transformed space result:', result);
    return result;
  });
  
  console.log('Final transformed result:', transformed);
  return transformed;
}



export function NavProjects() {
  const { } = useSidebar() // Removed unused isMobile
  const [mounted, setMounted] = useState(false)
  const [openProjects, setOpenProjects] = useState<string[]>([])
  const [openFolders, setOpenFolders] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleItems, setVisibleItems] = useState<Project[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [, setIsLoading] = useState(true) // Kept setIsLoading as it's used in fetchProjects
  const [openAddProjectDialog, setOpenAddProjectDialog] = useState(false)
  const [openAddFolderDialog, setOpenAddFolderDialog] = useState(false)
  const [openAddListDialog, setOpenAddListDialog] = useState(false)
  const [openAddListToFolderDialog, setOpenAddListToFolderDialog] = useState(false)
  const [openRenameSpaceDialog, setOpenRenameSpaceDialog] = useState(false)
  const [openRenameFolderDialog, setOpenRenameFolderDialog] = useState(false)
  const [openRenameListDialog, setOpenRenameListDialog] = useState(false)

  // Sharing sheet states
  const [openProjectSharingSheet, setOpenProjectSharingSheet] = useState(false)
  const [openFolderSharingSheet, setOpenFolderSharingSheet] = useState(false)
  const [openListSharingSheet, setOpenListSharingSheet] = useState(false)

  // Delete confirmation dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)

  // Move List sheet state
  const [openMoveListSheet, setOpenMoveListSheet] = useState(false)
  const [targetProjectId, setTargetProjectId] = useState<string>("")
  const [targetFolderId, setTargetFolderId] = useState<string>("")
  const [selectedTargetFolder, setSelectedTargetFolder] = useState<any>(null)
  const [availableFolders, setAvailableFolders] = useState<any[]>([])

  // Duplicate List sheet state
  const [openDuplicateListSheet, setOpenDuplicateListSheet] = useState(false)

  // List Statuses sheet state
  const [openListStatusesSheet, setOpenListStatusesSheet] = useState(false)

  // Custom Fields sheet state
  const [openCustomFieldsSheet, setOpenCustomFieldsSheet] = useState(false)

  const [newProjectName, setNewProjectName] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [newListName, setNewListName] = useState("")
  const [newSpaceName, setNewSpaceName] = useState("")
  const [newFolderNameForRename, setNewFolderNameForRename] = useState("")
  const [newListNameForRename, setNewListNameForRename] = useState("")

  // User type definition
  interface User {
    _id: string;
    id: string;
    name: string;
    email: string;
    permission: string;
    user_FL: string;
    roleData: ReactNode;
    status?: string;
    phone?: string;
    profile_image?: string;
    inherited?: boolean;
    permissionId?: string; // Add permission ID field
  }

  // Sharing state
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("")
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)
  const [currentSpaceId, setCurrentSpaceId] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)

  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [selectedFolderId, setSelectedFolderId] = useState<string>("")
  const [selectedItemId, setSelectedItemId] = useState<string>("")
  const [selectedItemName, setSelectedItemName] = useState<string>("")
  const [selectedItemType, setSelectedItemType] = useState<string>("")

  // Task status templates state
  const [taskStatusTemplates, setTaskStatusTemplates] = useState<any[]>([])
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>("")


// Function to fetch sharing permissions for an item
const fetchSharingPermissions = async (itemId: string, itemType: 'space' | 'folder' | 'list') => {
  try {
    const userData = JSON.parse(localStorage.getItem('map_user') || '{}');
    const token = userData.access_token;

    if (!token) {
      throw new Error('No access token found');
    }

    const endpoint = `${URLS.sharing_permissions}/${itemId}/${itemType}`;
    console.log('Fetching sharing permissions from:', endpoint);
    console.log('Item details:', { itemId, itemType });
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Sharing permissions response status:', response.status);
    console.log('Sharing permissions response headers:', response.headers);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Sharing permissions error response:', errorData);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
    }

    const result = await response.json();
    console.log('Sharing permissions response:', result);

    if (result.code === 200) {
      // Return both the direct permissions and parent permissions
      const permissions = {
        directPermissions: result.response || [],
        parentFolderPermissions: result.parent_from_folder || [],
        parentListPermissions: result.parent_from_list || []
      };
      console.log('Processed permissions:', permissions);
      return permissions;
    }
    
    console.warn('Sharing permissions response code not 200:', result.code);
    return { directPermissions: [], parentFolderPermissions: [], parentListPermissions: [] };
  } catch (error) {
    console.error('Error fetching sharing permissions:', error);
    toast({
      title: 'Error',
      description: 'Failed to load sharing permissions',
      variant: 'destructive',
    });
    return { directPermissions: [], parentFolderPermissions: [], parentListPermissions: [] };
  }
};

// Separate function to fetch available users for adding to sharing
const fetchAvailableUsers = async () => {
  try {
    setIsLoadingUsers(true);
    const userData = JSON.parse(localStorage.getItem('map_user') || '{}');
    const token = userData.access_token;

    if (!token) {
      throw new Error('No access token found');
    }

    console.log('Fetching users from:', URLS.USERS_LIST);
    const response = await fetch(URLS.USERS_LIST, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
    }

    const result = await response.json();
    console.log('Users API response:', result);

    if (result.code === 200 && Array.isArray(result.data)) {
      // Transform the API response to match the expected format
      const formattedUsers = result.data.map((user: any) => ({
        _id: user._id,
        id: user._id, // Add id field for compatibility
        name: user.name || 'Unknown User',
        email: user.email || 'No email',
        permission: 'none', // Default permission for new users
        user_FL: user.user_FL || (user.name ? user.name.charAt(0).toUpperCase() : 'U'),
        roleData: user.roleData || 'User',
        status: user.status || 'active',
        phone: user.phone || '',
        profile_image: user.profile_image || ''
      }));
      
      console.log('Formatted users:', formattedUsers);
      setUsers(formattedUsers);
      return formattedUsers;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error) {
    console.error('Error in fetchAvailableUsers:', error);
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to load users',
      variant: 'destructive',
    });
    setUsers([]);
    return [];
  } finally {
    setIsLoadingUsers(false);
  }
};







  const { toast } = useToast()

  // Map API permission values to UI values
  const mapApiPermissionToUI = (apiPermission: string): string => {
    switch (apiPermission) {
      case 'view_all':
        return 'all';
      case 'view_own':
        return 'own';
      case 'edit':
        return 'edit';
      case 'comment':
        return 'view'; // Map comment to view for now
      case 'no_access':
        return 'none';
      default:
        return 'none';
    }
  };

  // Map UI permission values to API values
  const mapUIToApiPermission = (uiPermission: string): string => {
    switch (uiPermission) {
      case 'all':
        return 'view_all';
      case 'own':
        return 'view_own';
      case 'view':
        return 'view_all';
      case 'edit':
        return 'edit';
      case 'none':
        return 'no_access';
      default:
        return 'no_access';
    }
  };

  const pathname = usePathname()

  // Create a ref to store the fetchProjects function
  const fetchProjectsRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Create a state to trigger refreshes
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to manually trigger a refresh
  const refreshProjects = async () => {
    console.log('Manual refresh triggered');

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      console.log('Fetching fresh projects data...');
      const response = await fetch(`${URLS.everything_onespace_list}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });

      console.log('Refresh response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Refresh error response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
      }

      const result = await response.json();
      console.log('Manual refresh result:', result);

      if (result.code === 200) {
        const transformedProjects = transformSpaceData(result);
        console.log('Manually refreshed projects:', transformedProjects);
        setProjects(transformedProjects);
        console.log('Projects state updated successfully');
      } else {
        console.error('Refresh API returned non-200 code:', result);
        throw new Error(result.msg || 'Failed to refresh projects');
      }
    } catch (error) {
      console.error('Error in manual refresh:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh projects data',
        variant: 'destructive',
      });
    }
  };

  // Set mounted state to true after component mounts (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch task status templates
  useEffect(() => {
    if (!mounted) return // Don't fetch if not mounted yet
    
    const fetchTaskStatusTemplates = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
        const token = userData.access_token
        if (!token) return

        const response = await fetch(`${URLS.task_status_templates}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) return
        const result = await response.json()

        if (result.code === 200 && Array.isArray(result.data)) {
          setTaskStatusTemplates(result.data)
          
          // Find default template or use first one
          const defaultTemplate = result.data.find((template: any) => template.default === 1) || result.data[0]
          if (defaultTemplate) {
            setDefaultTemplateId(defaultTemplate._id)
            console.log('Default template ID set to:', defaultTemplate._id)
          }
        }
      } catch (error) {
        console.error('Error fetching task status templates:', error)
      }
    }

    fetchTaskStatusTemplates()
  }, [mounted])

  useEffect(() => {
    if (!mounted) return // Don't fetch if not mounted yet
    
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
        const token = userData.access_token
        if (!token) throw new Error('No access token found')

        console.log('Fetching projects data...');
        const response = await fetch(`${URLS.everything_onespace_list}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          // Add cache busting parameter to prevent caching
          cache: 'no-store'
        })

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const result = await response.json()
        console.log('Fetched projects:', result);

        if (result.code === 200) {
          const transformedProjects = transformSpaceData(result)
          console.log('Transformed projects in useEffect:', transformedProjects);
          setProjects(transformedProjects)
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Store the function in the ref so it can be called from other functions
    fetchProjectsRef.current = fetchProjects;

    // Call the function
    fetchProjects();
  }, [mounted, refreshTrigger]) // Add mounted and refreshTrigger as dependencies

  const toggleProject = (projectName: string) => {
    setOpenProjects((prev) =>
      prev.includes(projectName) ? prev.filter((name) => name !== projectName) : [...prev, projectName],
    )
  }

  const toggleFolder = (folderId: string) => {
    setOpenFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId],
    )
  }

  const truncateText = (text: string, limit: number) => {
    return text.length > limit ? text.substring(0, limit) + "..." : text
  }

  useEffect(() => {
    setVisibleItems(projects)
  }, [projects])

  // Function to fetch sharing data
  const fetchSharingData = useCallback(async () => {
    if (!openFolderSharingSheet && !openProjectSharingSheet && !openListSharingSheet) {
      console.log('No sharing sheet is open, skipping fetch');
      return;
    }

    console.log('Fetching data for sharing sheet...');
    console.log('Sheet states:', {
      openFolderSharingSheet,
      openProjectSharingSheet,
      openListSharingSheet
    });
    console.log('Selected IDs:', {
      selectedProjectId,
      selectedFolderId,
      selectedItemId
    });
    
    setIsLoadingUsers(true);
    
    try {
      // Determine the item type and ID
      let itemId = '';
      let itemType: 'space' | 'folder' | 'list' | '' = '';
      
      if (openProjectSharingSheet && selectedProjectId) {
        itemId = selectedProjectId;
        itemType = 'space';
      } else if (openFolderSharingSheet && selectedFolderId) {
        itemId = selectedFolderId;
        itemType = 'folder';
      } else if (openListSharingSheet && selectedItemId) {
        itemId = selectedItemId;
        itemType = 'list';
      }
      
      if (!itemId || !itemType) {
        console.warn('Missing item ID or type for sharing:', { itemId, itemType });
        return;
      }

      console.log(`Loading data for ${itemType} ${itemId}`);
      
      // Fetch users and permissions in parallel
      const [users, permissions] = await Promise.all([
        fetchAvailableUsers(),
        fetchSharingPermissions(itemId, itemType)
      ]);
      
      console.log('Fetched users:', users);
      console.log('Fetched permissions:', permissions);
      console.log('Direct permissions:', permissions.directPermissions);
      console.log('Parent folder permissions:', permissions.parentFolderPermissions);
      console.log('Parent list permissions:', permissions.parentListPermissions);
      
      // Map permissions to users
      const usersWithPermissions = users.map((user: User) => {
        console.log(`Processing user: ${user.name} (${user._id})`);
        
        // Check direct permissions first
        const directPermission = permissions.directPermissions.find(
          (p: { user_id: string; permissions: string; _id: string }) => p.user_id === user._id
        );
        if (directPermission) {
          console.log(`Found direct permission for ${user.name}:`, directPermission);
          return { 
            ...user, 
            permission: mapApiPermissionToUI(directPermission.permissions),
            permissionId: directPermission._id // Store the permission ID
          };
        }
        
        // Check parent folder permissions
        const folderPermission = permissions.parentFolderPermissions.find(
          (p: { user_id: string; permissions: string; _id: string }) => p.user_id === user._id
        );
        if (folderPermission) {
          console.log(`Found folder permission for ${user.name}:`, folderPermission);
          return { 
            ...user, 
            permission: mapApiPermissionToUI(folderPermission.permissions), 
            inherited: true,
            permissionId: folderPermission._id // Store the permission ID
          };
        }
        
        // Check parent list permissions
        const listPermission = permissions.parentListPermissions.find(
          (p: { user_id: string; permissions: string; _id: string }) => p.user_id === user._id
        );
        if (listPermission) {
          console.log(`Found list permission for ${user.name}:`, listPermission);
          return { 
            ...user, 
            permission: mapApiPermissionToUI(listPermission.permissions), 
            inherited: true,
            permissionId: listPermission._id // Store the permission ID
          };
        }
        
        // Default to no permission
        console.log(`No permission found for ${user.name}, setting to 'none'`);
        return { ...user, permission: 'none' };
      });
      
      console.log('Users with permissions:', usersWithPermissions);
      setUsers(usersWithPermissions);
      
    } catch (error) {
      console.error('Error in sharing sheet effect:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sharing data',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [
    openFolderSharingSheet, 
    openProjectSharingSheet, 
    openListSharingSheet, 
    selectedProjectId, 
    selectedFolderId, 
    selectedItemId
  ]);

  // Fetch sharing data when sheet opens or when dependencies change
  useEffect(() => {
    if (openFolderSharingSheet || openProjectSharingSheet || openListSharingSheet) {
      fetchSharingData();
    }
  }, [
    openFolderSharingSheet, 
    openProjectSharingSheet, 
    openListSharingSheet, 
    selectedProjectId, 
    selectedFolderId, 
    selectedItemId
  ]);

  // Auto-fetch sharing permissions when list sharing sheet opens
  useEffect(() => {
    if (openListSharingSheet && currentSpaceId && selectedItemId) {
      // fetchSharingPermissions();
    }
  }, [openListSharingSheet, currentSpaceId, selectedItemId])

  // Add missing helper functions to fix reference errors
  function isListActive(url: string | undefined) {
    if (!url) return false;
    return pathname === url;
  }

  function findParentActive(subProjects: Project[] | undefined): boolean {
    if (!subProjects) return false;
    return subProjects.some(
      (sub) => isListActive(sub.url) || findParentActive(sub.subProjects)
    );
  }

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name cannot be empty",
        variant: "destructive",
      })
      return
    }

    // Store the project name
    const projectName = newProjectName;

    // Close the dialog and reset form
    setOpenAddProjectDialog(false)
    setNewProjectName("")

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      // API endpoint for creating a project
      const response = await fetch(`${URLS.onespace}`, {
      
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: projectName
        })
      })

      const result = await response.json()

      if (result.code === 200) {
        toast({
          title: "Success",
          description: result.msg || "Project created successfully",
        })

        // Force a delay before refreshing to ensure the backend has processed the change
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refresh the projects list
        const refreshResponse = await fetch(`${URLS.everything_onespace_list}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store' // Prevent caching
        })

        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json()
          if (refreshResult.code === 200) {
            const transformedProjects = transformSpaceData(refreshResult)
            setProjects(transformedProjects)
          }
        }
      } else {
        throw new Error(result.message || "Failed to create project")
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      })
    }
  }

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (!selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      })
      return
    }

    // Store the current project ID and folder name
    const currentProjectId = selectedProjectId;
    const folderName = newFolderName;

    // Close the dialog and reset form
    setOpenAddFolderDialog(false)
    setNewFolderName("")

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      // API endpoint for creating a folder
      const response = await fetch(`${URLS.onefolder_add}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: folderName,
          onespace_id: currentProjectId
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()

      if (result.code === 200) {
        toast({
          title: "Success",
          description: result.msg || "Folder created successfully",
        })

        console.log('Folder creation response:', result);

        // Force a delay before refreshing to ensure the backend has processed the change
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Find the project to ensure it's open in the sidebar
        const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
        const token = userData.access_token

        // Get the project details to ensure we have the correct name
        const projectResponse = await fetch(`${URLS.onespace}/${currentProjectId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).catch(err => {
          console.error('Error fetching project details:', err);
          return null;
        });

        if (projectResponse && projectResponse.ok) {
          const projectData = await projectResponse.json();
          if (projectData.code === 200 && projectData.data) {
            // Make sure the project is open in the sidebar
            setOpenProjects(prev =>
              prev.includes(projectData.data.name)
                ? prev
                : [...prev, projectData.data.name]
            );
          }
        }

        // Use the refresh function to update the projects list
        refreshProjects();
      } else {
        throw new Error(result.msg || "Failed to create folder")
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive",
      })
    }
  }

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newListName.trim()) {
      toast({
        title: "Error",
        description: "List name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (!selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      })
      return
    }

    // Check if we have a template ID
    const templateId = defaultTemplateId || (taskStatusTemplates.length > 0 ? taskStatusTemplates[0]._id : "")
    if (!templateId) {
      toast({
        title: "Error",
        description: "No task status template available. Please ensure templates are configured.",
        variant: "destructive",
      })
      return
    }

    // Store the current project ID and list name
    const currentProjectId = selectedProjectId;
    const listName = newListName;

    // Close the dialog and reset form
    setOpenAddListDialog(false)
    setNewListName("")

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      // API endpoint for creating a list
      const response = await fetch(`${URLS.onelist}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: listName,
          onespace_id: currentProjectId,
          associate_to: "space",
          task_status_template_id: templateId
        })
      })



      

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()

      if (result.code === 200) {
        toast({
          title: "Success",
          description: "List created successfully",
        })

        // Refresh the projects list
        const refreshResponse = await fetch(`${URLS.everything_onespace_list}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (refreshResponse.ok) {
          const refreshResult = await refreshResponse.json()
          if (refreshResult.code === 200) {
            const transformedProjects = transformSpaceData(refreshResult)
            setProjects(transformedProjects)
          }
        }
      } else {
        throw new Error(result.message || "Failed to create list")
      }
    } catch (error) {
      console.error('Error creating list:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create list",
        variant: "destructive",
      })
    }
  }

  const handleAddListToFolder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newListName.trim()) {
      toast({
        title: "Error",
        description: "List name cannot be empty",
        variant: "destructive",
      })
      return
    }

    if (!selectedFolderId) {
      toast({
        title: "Error",
        description: "Please select a folder",
        variant: "destructive",
      })
      return
    }

    // Check if we have a template ID
    const templateId = defaultTemplateId || (taskStatusTemplates.length > 0 ? taskStatusTemplates[0]._id : "")
    if (!templateId) {
      toast({
        title: "Error",
        description: "No task status template available. Please ensure templates are configured.",
        variant: "destructive",
      })
      return
    }

    // Store the current folder ID and list name
    const currentFolderId = selectedFolderId;
    const listName = newListName;

    // Close the dialog and reset form
    setOpenAddListToFolderDialog(false)
    setNewListName("")
    setSelectedFolderId("")

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      // API endpoint for creating a list in a folder
      const response = await fetch(`${URLS.onelist}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: listName,
          onefolder_id: currentFolderId,
          associate_to: "folder",
          task_status_template_id: templateId
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()

      if (result.code === 200) {
        toast({
          title: "Success",
          description: "List created successfully in folder",
        })

        console.log('Folder list creation response:', result);

        // Force a delay before refreshing to ensure the backend has processed the change
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Use the refresh function to update the projects list
        refreshProjects();
      } else {
        throw new Error(result.msg || "Failed to create list in folder")
      }
    } catch (error) {
      console.error('Error creating list in folder:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create list in folder",
        variant: "destructive",
      })
    }
  }

  const handleRenameSpace = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newSpaceName.trim()) {
      toast({
        title: "Error",
        description: "Space name cannot be empty",
        variant: "destructive",
      })
      return
    }

    // Store the space ID and new name
    const spaceId = selectedItemId;
    const spaceName = newSpaceName;

    // Close the dialog and reset form
    setOpenRenameSpaceDialog(false)
    setNewSpaceName("")

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      console.log('Renaming space with ID:', spaceId, 'to name:', spaceName);

      // API endpoint for renaming a space
      const response = await fetch(`${URLS.taskspace_rename}/${spaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: spaceName
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      console.log('Space rename API response:', result);

      if (result.code === 200) {
        toast({
          title: "Success",
          description: result.msg || "Space renamed successfully",
        })

        console.log('Space renamed successfully, updating UI...');

        // ONLY update the local state with the new name - no additional API calls
        // This is the key to preventing flickering
        setProjects(prevProjects => {
          console.log('Current projects before update:', prevProjects);
          const updatedProjects = prevProjects.map(project => {
            if (project._id === spaceId) {
              console.log('Found project to update:', project);
              return {
                ...project,
                name: spaceName
              };
            }
            return project;
          });
          console.log('Updated projects:', updatedProjects);
          return updatedProjects;
        });

        // Schedule a background refresh without affecting the UI
        // This ensures data consistency without causing flickering
        setTimeout(() => {
          (async () => {
            try {
              console.log('Background refresh starting...');
              const refreshResponse = await fetch(`${URLS.everything_onespace_list}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
              });

              if (refreshResponse.ok) {
                const refreshResult = await refreshResponse.json();
                console.log('Background refresh completed');

                if (refreshResult.code === 200) {
                  // Instead of directly setting state, we'll compare and only update if needed
                  const transformedProjects = transformSpaceData(refreshResult);

                  // Get current projects from state
                  const currentProjects = [...projects];

                  // Deep comparison function
                  const areProjectsEqual = (a: Project[], b: Project[]): boolean => {
                    if (a.length !== b.length) return false;

                    // Create maps for faster lookup
                    const aMap = new Map(a.map((p: Project) => [p._id, p]));

                    // Check if all projects in b match those in a
                    return b.every((projectB: Project) => {
                      const projectA = aMap.get(projectB._id);
                      if (!projectA) return false;
                      return projectA.name === projectB.name;
                    });
                  };

                  // Only update if there's a meaningful difference
                  if (!areProjectsEqual(currentProjects, transformedProjects)) {
                    console.log('Background data differs from current state, updating silently');
                    setProjects(transformedProjects);
                  } else {
                    console.log('No difference detected, skipping update');
                  }
                }
              }
            } catch (error) {
              console.error('Background refresh error:', error);
            }
          })();
        }, 3000); // Delay the background refresh by 3 seconds
      } else {
        throw new Error(result.msg || "Failed to rename space")
      }
    } catch (error) {
      console.error('Error renaming space:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename space",
        variant: "destructive",
      })

      // Don't immediately refresh to avoid flickering
      console.log('Error occurred during rename');

      // Schedule a background refresh without affecting the UI
      setTimeout(() => {
        refreshProjects().catch(err => {
          console.error('Error in background refresh after error:', err);
        });
      }, 3000);
    }
  }

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newFolderNameForRename.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive",
      })
      return
    }

    // Store the folder ID and new name
    const folderId = selectedItemId;
    const folderName = newFolderNameForRename;

    // Close the dialog and reset form
    setOpenRenameFolderDialog(false)
    setNewFolderNameForRename("")

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      console.log('Renaming folder with ID:', folderId, 'to name:', folderName);

      // API endpoint for renaming a folder
      const response = await fetch(`${URLS.taskfolder_rename}/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: folderName
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      console.log('Folder rename API response:', result);

      if (result.code === 200) {
        toast({
          title: "Success",
          description: result.msg || "Folder renamed successfully",
        })

        console.log('Folder renamed successfully, updating UI...');

        // ONLY update the local state with the new name - no additional API calls
        // This is the key to preventing flickering
        setProjects(prevProjects => {
          console.log('Current projects before update:', prevProjects);

          // Find the folder in the projects hierarchy and update its name
          const updatedProjects = prevProjects.map(project => {
            // Check if the folder is in this project's subProjects
            if (project.subProjects) {
              const updatedSubProjects = project.subProjects.map(subProject => {
                if (subProject._id === folderId) {
                  console.log('Found folder to update:', subProject);
                  return {
                    ...subProject,
                    name: folderName
                  };
                }
                return subProject;
              });

              return {
                ...project,
                subProjects: updatedSubProjects
              };
            }
            return project;
          });

          console.log('Updated projects:', updatedProjects);
          return updatedProjects;
        });

        // Schedule a background refresh without affecting the UI
        // This ensures data consistency without causing flickering
        setTimeout(() => {
          (async () => {
            try {
              console.log('Background refresh starting...');
              const refreshResponse = await fetch(`${URLS.everything_onespace_list}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
              });

              if (refreshResponse.ok) {
                const refreshResult = await refreshResponse.json();
                console.log('Background refresh completed');

                if (refreshResult.code === 200) {
                  // Instead of directly setting state, we'll compare and only update if needed
                  const transformedProjects = transformSpaceData(refreshResult);

                  // Get current projects from state
                  const currentProjects = [...projects];

                  // Deep comparison function
                  const areProjectsEqual = (a: Project[], b: Project[]): boolean => {
                    if (a.length !== b.length) return false;

                    // Create maps for faster lookup
                    const aMap = new Map(a.map((p: Project) => [p._id, p]));

                    // Check if all projects in b match those in a
                    return b.every((projectB: Project) => {
                      const projectA = aMap.get(projectB._id);
                      if (!projectA) return false;
                      return projectA.name === projectB.name;
                    });
                  };

                  // Only update if there's a meaningful difference
                  if (!areProjectsEqual(currentProjects, transformedProjects)) {
                    console.log('Background data differs from current state, updating silently');
                    setProjects(transformedProjects);
                  } else {
                    console.log('No difference detected, skipping update');
                  }
                }
              }
            } catch (error) {
              console.error('Background refresh error:', error);
            }
          })();
        }, 3000); // Delay the background refresh by 3 seconds
      } else {
        throw new Error(result.msg || "Failed to rename folder")
      }
    } catch (error) {
      console.error('Error renaming folder:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename folder",
        variant: "destructive",
      })

      // Don't immediately refresh to avoid flickering
      console.log('Error occurred during folder rename');

      // Schedule a background refresh without affecting the UI
      setTimeout(() => {
        refreshProjects().catch(err => {
          console.error('Error in background refresh after error:', err);
        });
      }, 3000);
    }
  }

  const handleRenameList = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newListNameForRename.trim()) {
      toast({
        title: "Error",
        description: "List name cannot be empty",
        variant: "destructive",
      })
      return
    }

    // Store the list ID and new name
    const listId = selectedItemId;
    const listName = newListNameForRename;

    // Close the dialog and reset form
    setOpenRenameListDialog(false)
    setNewListNameForRename("")

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      if (!token) throw new Error('No access token found')

      console.log('Renaming list with ID:', listId, 'to name:', listName);

      // API endpoint for renaming a list
      const response = await fetch(`${URLS.task_list_rename}/${listId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: listName
        })
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      console.log('List rename API response:', result);

      if (result.code === 200) {
        toast({
          title: "Success",
          description: result.msg || "List renamed successfully",
        })

        console.log('List renamed successfully, updating UI...');

        // ONLY update the local state with the new name - no additional API calls
        // This is the key to preventing flickering
        setProjects(prevProjects => {
          console.log('Current projects before update:', prevProjects);

          // Find the list in the projects hierarchy and update its name
          const updatedProjects = prevProjects.map(project => {
            if (project.subProjects) {
              // First check if the list is directly under the project
              const directListIndex = project.subProjects.findIndex(subProject =>
                subProject._id === listId && subProject.icon === ListIcon
              );

              if (directListIndex !== -1) {
                // List is directly under the project
                const updatedSubProjects = [...project.subProjects];
                updatedSubProjects[directListIndex] = {
                  ...updatedSubProjects[directListIndex],
                  name: listName
                };

                return {
                  ...project,
                  subProjects: updatedSubProjects
                };
              }

              // If not found directly, check inside folders
              const updatedSubProjects = project.subProjects.map(subProject => {
                // Check if this is a folder with subProjects
                if (subProject.subProjects) {
                  // Look for the list inside this folder
                  const folderListIndex = subProject.subProjects.findIndex(nestedProject =>
                    nestedProject._id === listId
                  );

                  if (folderListIndex !== -1) {
                    // Found the list inside this folder
                    const updatedFolderLists = [...subProject.subProjects];
                    updatedFolderLists[folderListIndex] = {
                      ...updatedFolderLists[folderListIndex],
                      name: listName
                    };

                    return {
                      ...subProject,
                      subProjects: updatedFolderLists
                    };
                  }
                }

                return subProject;
              });

              return {
                ...project,
                subProjects: updatedSubProjects
              };
            }

            return project;
          });

          console.log('Updated projects:', updatedProjects);
          return updatedProjects;
        });

        // Schedule a background refresh without affecting the UI
        // This ensures data consistency without causing flickering
        setTimeout(() => {
          (async () => {
            try {
              console.log('Background refresh starting...');
              const refreshResponse = await fetch(`${URLS.everything_onespace_list}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
              });

              if (refreshResponse.ok) {
                const refreshResult = await refreshResponse.json();
                console.log('Background refresh completed');

                if (refreshResult.code === 200) {
                  // Instead of directly setting state, we'll compare and only update if needed
                  const transformedProjects = transformSpaceData(refreshResult);

                  // Get current projects from state
                  const currentProjects = [...projects];

                  // Deep comparison function
                  const areProjectsEqual = (a: Project[], b: Project[]): boolean => {
                    if (a.length !== b.length) return false;

                    // Create maps for faster lookup
                    const aMap = new Map(a.map((p: Project) => [p._id, p]));

                    // Check if all projects in b match those in a
                    return b.every((projectB: Project) => {
                      const projectA = aMap.get(projectB._id);
                      if (!projectA) return false;
                      return projectA.name === projectB.name;
                    });
                  };

                  // Only update if there's a meaningful difference
                  if (!areProjectsEqual(currentProjects, transformedProjects)) {
                    console.log('Background data differs from current state, updating silently');
                    setProjects(transformedProjects);
                  } else {
                    console.log('No difference detected, skipping update');
                  }
                }
              }
            } catch (error) {
              console.error('Background refresh error:', error);
            }
          })();
        }, 3000); // Delay the background refresh by 3 seconds
      } else {
        throw new Error(result.msg || "Failed to rename list")
      }
    } catch (error) {
      console.error('Error renaming list:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename list",
        variant: "destructive",
      })

      // Don't immediately refresh to avoid flickering
      console.log('Error occurred during list rename');

      // Schedule a background refresh without affecting the UI
      setTimeout(() => {
        refreshProjects().catch(err => {
          console.error('Error in background refresh after error:', err);
        });
      }, 3000);
    }
  }

  // Function to update user permission
  const updateUserPermission = async (userId: string | React.Key | null | undefined, permission: string) => {
    if (!userId) return;
    setIsLoadingPermissions(true);
    const userIdString = userId.toString();
    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}');
      const token = userData.access_token;
      if (!token) throw new Error('No access token found');

      // Determine the item type and ID
      let itemId = '';
      let itemType: 'space' | 'folder' | 'list' | '' = '';
      if (openProjectSharingSheet && selectedProjectId) {
        itemId = selectedProjectId;
        itemType = 'space';
      } else if (openFolderSharingSheet && selectedFolderId) {
        itemId = selectedFolderId;
        itemType = 'folder';
      } else if (openListSharingSheet && selectedItemId) {
        itemId = selectedItemId;
        itemType = 'list';
      }
      if (!itemId || !itemType) {
        throw new Error('Missing item ID or type for sharing');
      }

      // Find the user in the local state
      const user = users.find(u => u._id === userIdString || u.id === userIdString);
      const currentPermission = user?.permission || 'none';
      const permissionId = user?.permissionId;
      const apiPermission = mapUIToApiPermission(permission);
      let response: Response;
      let result: any;

      // If changing from 'none' to another permission, use POST
      if (currentPermission === 'none' && permission !== 'none') {
        // Use the base URL and include item type in payload
        const endpoint = URLS.sharing_permissions;
        
        // Use the legacy payload structure to avoid the field name mismatch
        const payload: any = {
          user_id: userIdString,
          permissions: apiPermission, // Use 'permissions' (plural) as expected by MongoDB model
          associate_to: itemType
        };
        
        // Add the appropriate ID field based on the type
        if (itemType === 'space') {
          payload.space_id = itemId;
        } else if (itemType === 'folder') {
          payload.folder_id = itemId;
        } else if (itemType === 'list') {
          payload.list_id = itemId;
        }
        
        console.log('POST Request Debug Info:');
        console.log('Endpoint:', endpoint);
        console.log('Current permission:', currentPermission);
        console.log('New permission:', permission);
        console.log('API permission:', apiPermission);
        console.log('Item type:', itemType);
        console.log('Item ID:', itemId);
        console.log('User ID:', userIdString);
        console.log('Full payload:', payload);
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('POST request failed with error data:', errorData);
          throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
        }
        
        result = await response.json();
        console.log('POST response result:', result);
        
        if (result.code === 200) {
          setUsers(prevUsers =>
            prevUsers.map((user) => {
              if (user._id === userIdString || user.id === userIdString) {
                // Try to get the permission ID from the response
                let newPermissionId;
                if (result.data && result.data.permissions && result.data.permissions.length > 0) {
                  newPermissionId = result.data.permissions[0]._id;
                } else if (result.data && result.data._id) {
                  newPermissionId = result.data._id;
                } else if (result.response && result.response.permissions && result.response.permissions.length > 0) {
                  newPermissionId = result.response.permissions[0]._id;
                } else if (result.response && result.response._id) {
                  newPermissionId = result.response._id;
                }
                return { ...user, permission, permissionId: newPermissionId };
              }
              return user;
            })
          );
          toast({ title: 'Success', description: `Permission set to ${permission === 'all' ? 'All Records' : 'Own Records'}` });
        } else {
          throw new Error(result.msg || 'Failed to create permission');
        }
      }
      // If changing from 'Own Records' or 'All Records' to 'None', use DELETE
      else if (permission === 'none' && currentPermission !== 'none') {
        console.log('DELETE Flow Debug Info:');
        console.log('User ID:', userIdString);
        console.log('Current permission:', currentPermission);
        console.log('New permission:', permission);
        console.log('Permission ID:', permissionId);
        console.log('Permission ID type:', typeof permissionId);
        console.log('Permission ID length:', permissionId ? permissionId.length : 'N/A');
        
        if (!permissionId) {
          console.error('No permission ID found for user. Cannot delete permission.');
          console.log('Attempting to refresh permissions to get the correct permission ID...');
          
          // Try to refresh the permissions to get the correct permission ID
          try {
            const refreshedPermissions = await fetchSharingPermissions(itemId, itemType);
            const refreshedUser = refreshedPermissions.directPermissions.find(
              (p: { user_id: string; permissions: string; _id: string }) => p.user_id === userIdString
            );
            
            if (refreshedUser && refreshedUser._id) {
              console.log('Found refreshed permission ID:', refreshedUser._id);
              // Update the user's permissionId in the state
              setUsers(prevUsers =>
                prevUsers.map((user) => {
                  if (user._id === userIdString || user.id === userIdString) {
                    return { ...user, permissionId: refreshedUser._id };
                  }
                  return user;
                })
              );
              
              // Retry the delete operation with the correct permission ID
              console.log('Retrying delete with refreshed permission ID...');
              const retryResponse = await fetch(`${URLS.sharing_permissions}/${refreshedUser._id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!retryResponse.ok) {
                const errorData = await retryResponse.text();
                throw new Error(`HTTP error! status: ${retryResponse.status}, details: ${errorData}`);
              }
              
              const retryResult = await retryResponse.json();
              if (retryResult.code === 200) {
                setUsers(prevUsers =>
                  prevUsers.map((user) => {
                    if (user._id === userIdString || user.id === userIdString) {
                      return { ...user, permission: 'none', permissionId: undefined };
                    }
                    return user;
                  })
                );
                toast({ title: 'Success', description: 'Permission removed successfully' });
                return; // Exit the function successfully
              } else {
                throw new Error(retryResult.msg || 'Failed to delete permission');
              }
            } else {
              throw new Error('Could not find permission ID even after refresh');
            }
          } catch (refreshError) {
            console.error('Error refreshing permissions:', refreshError);
            throw new Error('No permission ID found for user. Cannot delete permission.');
          }
        }
        
        console.log('DELETE Request Debug Info:');
        console.log('Permission ID to delete:', permissionId);
        console.log('Current permission:', currentPermission);
        console.log('New permission:', permission);
        console.log('User ID:', userIdString);
        
        response = await fetch(`${URLS.sharing_permissions}/${permissionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('DELETE Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('DELETE request failed with error data:', errorData);
          throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
        }
        
        result = await response.json();
        console.log('DELETE response result:', result);
        
        if (result.code === 200) {
          setUsers(prevUsers =>
            prevUsers.map((user) => {
              if (user._id === userIdString || user.id === userIdString) {
                return { ...user, permission: 'none', permissionId: undefined };
              }
              return user;
            })
          );
          toast({ title: 'Success', description: 'Permission removed successfully' });
        } else {
          throw new Error(result.msg || 'Failed to delete permission');
        }
      }
      // If changing between non-none permissions, use PUT
      else if (currentPermission !== 'none' && permission !== 'none') {
        console.log('PUT Flow Debug Info:');
        console.log('User ID:', userIdString);
        console.log('Current permission:', currentPermission);
        console.log('New permission:', permission);
        console.log('Permission ID:', permissionId);
        console.log('Permission ID type:', typeof permissionId);
        console.log('Permission ID length:', permissionId ? permissionId.length : 'N/A');
        
        if (!permissionId) {
          console.error('No permission ID found for user. Please try selecting None first.');
          console.log('Attempting to refresh permissions to get the correct permission ID...');
          
          // Try to refresh the permissions to get the correct permission ID
          try {
            const refreshedPermissions = await fetchSharingPermissions(itemId, itemType);
            const refreshedUser = refreshedPermissions.directPermissions.find(
              (p: { user_id: string; permissions: string; _id: string }) => p.user_id === userIdString
            );
            
            if (refreshedUser && refreshedUser._id) {
              console.log('Found refreshed permission ID:', refreshedUser._id);
              // Update the user's permissionId in the state
              setUsers(prevUsers =>
                prevUsers.map((user) => {
                  if (user._id === userIdString || user.id === userIdString) {
                    return { ...user, permissionId: refreshedUser._id };
                  }
                  return user;
                })
              );
              
              // Retry the update operation with the correct permission ID
              console.log('Retrying update with refreshed permission ID...');
              const retryPayload = { permissions: apiPermission };
              const retryResponse = await fetch(`${URLS.sharing_permissions}/${refreshedUser._id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(retryPayload)
              });
              
              if (!retryResponse.ok) {
                const errorData = await retryResponse.text();
                throw new Error(`HTTP error! status: ${retryResponse.status}, details: ${errorData}`);
              }
              
              const retryResult = await retryResponse.json();
              if (retryResult.code === 200) {
                setUsers(prevUsers =>
                  prevUsers.map((user) => {
                    if (user._id === userIdString || user.id === userIdString) {
                      return { ...user, permission };
                    }
                    return user;
                  })
                );
                toast({ title: 'Success', description: `Permission updated to ${permission === 'all' ? 'All Records' : 'Own Records'}` });
                return; // Exit the function successfully
              } else {
                throw new Error(retryResult.msg || 'Failed to update permission');
              }
            } else {
              throw new Error('Could not find permission ID even after refresh');
            }
          } catch (refreshError) {
            console.error('Error refreshing permissions:', refreshError);
            throw new Error('No permission ID found for user. Please try selecting None first.');
          }
        }
        
        const payload = { permissions: apiPermission }; // Keep as 'permissions' (plural)
        
        console.log('PUT Request Debug Info:');
        console.log('Permission ID to update:', permissionId);
        console.log('Current permission:', currentPermission);
        console.log('New permission:', permission);
        console.log('API permission:', apiPermission);
        console.log('User ID:', userIdString);
        console.log('Payload:', payload);
        
        response = await fetch(`${URLS.sharing_permissions}/${permissionId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        console.log('PUT Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('PUT request failed with error data:', errorData);
          throw new Error(`HTTP error! status: ${response.status}, details: ${errorData}`);
        }
        
        result = await response.json();
        console.log('PUT response result:', result);
        
        if (result.code === 200) {
          setUsers(prevUsers =>
            prevUsers.map((user) => {
              if (user._id === userIdString || user.id === userIdString) {
                return { ...user, permission };
              }
              return user;
            })
          );
          toast({ title: 'Success', description: `Permission updated to ${permission === 'all' ? 'All Records' : 'Own Records'}` });
        } else {
          throw new Error(result.msg || 'Failed to update permission');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update permission',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPermissions(false);
    }
  }

  // Toggle permission function similar to Angular code
  const togglePermission = async (event: React.ChangeEvent<HTMLInputElement>, user: any) => {
    try {
      // Toggle the checked state of the user
      const isChecked = event.target.checked;

      // Update local state immediately for better UX
      setUsers(users.map((u) =>
        u._id === user._id ? { ...u, checked: isChecked } : u
      ));

      // Check if the checkbox is checked or unchecked and update permissions accordingly
      if (isChecked) {
        // Update permission to "view_all"
        await updateUserPermission(user._id || user.id, "all");
      } else {
        // Update permission to "view_own"
        await updateUserPermission(user._id || user.id, "own");
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
      // Revert the local state change if API call fails
      setUsers(users.map((u) =>
        u._id === user._id ? { ...u, checked: !event.target.checked } : u
      ));
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
    }
  };

  // Test function to debug POST API

  // Save permissions function
  const savePermissions = async () => {
    try {
      setIsLoadingPermissions(true);
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}');
      const token = userData.access_token;

      if (!token) throw new Error('No access token found');

      // Determine the item type and ID
      let itemId = '';
      let itemType: 'space' | 'folder' | 'list' | '' = '';
      
      if (openProjectSharingSheet && selectedProjectId) {
        itemId = selectedProjectId;
        itemType = 'space';
      } else if (openFolderSharingSheet && selectedFolderId) {
        itemId = selectedFolderId;
        itemType = 'folder';
      } else if (openListSharingSheet && selectedItemId) {
        itemId = selectedItemId;
        itemType = 'list';
      }

      if (!itemId || !itemType) {
        throw new Error('Missing item ID or type for sharing');
      }

      // Get users with permissions (excluding 'none')
      const usersWithPermissions = users.filter(user => user.permission !== 'none');
      
      if (usersWithPermissions.length === 0) {
        toast({
          title: 'Info',
          description: 'No permissions to save',
        });
        return;
      }

      // Make individual API calls for each user to avoid the array format issue
      const promises = usersWithPermissions.map(async (user) => {
        const payload: any = {
          user_id: user._id,
          permissions: mapUIToApiPermission(user.permission), // Use 'permissions' (plural)
          associate_to: itemType
        };

        // Add the appropriate ID field based on the type
        if (itemType === 'space') {
          payload.space_id = itemId;
        } else if (itemType === 'folder') {
          payload.folder_id = itemId;
        } else if (itemType === 'list') {
          payload.list_id = itemId;
        }

        console.log(`Saving permission for user ${user.name} with payload:`, payload);

        const response = await fetch(URLS.sharing_permissions, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to save permission for ${user.name}: ${response.status} - ${errorData}`);
        }

        const result = await response.json();
        console.log(`Save permission response for ${user.name}:`, result);

        if (result.code !== 200) {
          throw new Error(result.msg || `Failed to save permission for ${user.name}`);
        }

        return result;
      });

      // Wait for all permissions to be saved
      await Promise.all(promises);

      toast({
        title: 'Success',
        description: 'All permissions saved successfully',
      });
      
      // Close the sharing sheet
      if (openProjectSharingSheet) setOpenProjectSharingSheet(false);
      if (openFolderSharingSheet) setOpenFolderSharingSheet(false);
      if (openListSharingSheet) setOpenListSharingSheet(false);
      
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save permissions',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  // Handle delete function
  const handleDelete = async () => {

    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}');
      const token = userData.access_token;
      
      if (!token) throw new Error('No access token found');

      if (!selectedItemId || !selectedItemType) {
        throw new Error('Missing item information for deletion');
      }

      let endpoint = '';

      if (selectedItemType === 'space') {
        endpoint = `${URLS.spaces_delete}/${selectedItemId}`;
      } else if (selectedItemType === 'folder') {
        endpoint = `${URLS.folder_delete}/${selectedItemId}`;
      } else if (selectedItemType === 'list') {
        endpoint = `${URLS.onelist_delete}/${selectedItemId}`;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to delete: ${response.status} - ${errorData}`);
      }

      const result: any = await response.json();
      
      if (result.code === 200) {
        toast({
          title: 'Success',
          description: result.msg || `${selectedItemType} deleted successfully`,
        });
        
        // Close the delete dialog
        setOpenDeleteDialog(false);
        
        // Refresh the projects list
        if (fetchProjectsRef.current) {
          await fetchProjectsRef.current();
        }
      } else {
        throw new Error(result.msg || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  // Handle move list function
  const handleMoveList = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}');
      const token = userData.access_token;
      
      if (!token) throw new Error('No access token found');

      if (!selectedItemId) {
        throw new Error('Missing item information for moving');
      }

      console.log('Moving list with ID:', selectedItemId);

      // Step 1: First, remove the list from its current location
      console.log('Step 1: Removing list from current location...');
      const removePayload = {
        onespace_id: null,
        onefolder_id: null,
        associate_to: 'none'
      };

      const removeResponse = await fetch(`${URLS.one_list_update}/${selectedItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(removePayload),
      });

      console.log('Remove API response status:', removeResponse.status);

      if (!removeResponse.ok) {
        const errorData = await removeResponse.text();
        console.error('Remove API error response:', errorData);
        throw new Error(`Failed to remove list from current location: ${removeResponse.status} - ${errorData}`);
      }

      const removeResult = await removeResponse.json();
      console.log('Remove API response result:', removeResult);

      if (removeResult.code !== 200) {
        throw new Error(removeResult.msg || 'Failed to remove list from current location');
      }

      // Step 2: Then, add the list to the new location
      console.log('Step 2: Adding list to new location...');
      let addPayload: any = {};
      
      if (targetFolderId) {
        // Moving to a folder
        addPayload = {
          onefolder_id: targetFolderId,
          associate_to: 'folder'
        };
        console.log('Moving list to folder with payload:', addPayload);
      } else if (targetProjectId) {
        // Moving to a space (project)
        addPayload = {
          onespace_id: targetProjectId,
          associate_to: 'space'
        };
        console.log('Moving list to project with payload:', addPayload);
      } else {
        throw new Error('Please select a destination');
      }

      const addResponse = await fetch(`${URLS.one_list_update}/${selectedItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addPayload),
      });

      console.log('Add API response status:', addResponse.status);

      if (!addResponse.ok) {
        const errorData = await addResponse.text();
        console.error('Add API error response:', errorData);
        throw new Error(`Failed to add list to new location: ${addResponse.status} - ${errorData}`);
      }

      const addResult = await addResponse.json();
      console.log('Add API response result:', addResult);
      
      if (addResult.code === 200) {
        toast({
          title: 'Success',
          description: 'List moved successfully',
        });
        
        // Close the move dialog
        setOpenMoveListSheet(false);
        setTargetProjectId("");
        setTargetFolderId("");
        setSelectedTargetFolder(null);
        setAvailableFolders([]);
        
        // Force a refresh of the projects list to ensure the UI is updated
        console.log('Refreshing projects after move...');
        
        // Force a delay before refreshing to ensure the backend has processed the change
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use the refresh function to update the projects list
        await refreshProjects();
        
        // Also increment the refresh trigger to ensure the useEffect runs
        setRefreshTrigger(prev => prev + 1);
        
        // Verify the move operation by checking if the list appears in the expected location
        setTimeout(() => {
          const movedListId = selectedItemId;
          const expectedFolderId = targetFolderId;
          
          console.log('Verifying move operation...');
          console.log('Looking for list ID:', movedListId, 'in folder ID:', expectedFolderId);
          
          const project = projects.find(p => p._id === targetProjectId);
          if (project) {
            console.log('Found project:', project.name);
            console.log('All project subProjects:', project.subProjects);
            
            // Check if list is directly under the project
            const directList = project.subProjects?.find(item => 
              item.icon === ListIcon && item._id === movedListId
            );
            if (directList) {
              console.log('❌ ISSUE: List found directly under project:', directList.name);
            } else {
              console.log('✅ List NOT found directly under project (good)');
            }
            
            // Check if list is in any folder
            let foundInFolder = false;
            project.subProjects?.forEach(subProject => {
              if (subProject.icon === FolderOpen) {
                console.log('Checking folder:', subProject.name, 'with ID:', subProject._id);
                console.log('Folder subProjects:', subProject.subProjects);
                
                const folderList = subProject.subProjects?.find(item => item._id === movedListId);
                if (folderList) {
                  console.log('✅ List found in folder:', subProject.name, 'List name:', folderList.name);
                  foundInFolder = true;
                  
                  // Check if this is the expected folder
                  if (subProject._id === expectedFolderId) {
                    console.log('✅ List is in the correct target folder');
                  } else {
                    console.log('❌ ISSUE: List is in wrong folder. Expected:', expectedFolderId, 'Found in:', subProject._id);
                  }
                }
              }
            });
            
            if (!foundInFolder) {
              console.log('❌ ISSUE: List not found in any folder');
            }
          }
        }, 2000); // Check after 2 seconds
        
        console.log('Move operation completed successfully');
      } else {
        console.error('Add API returned non-200 code:', addResult);
        throw new Error(addResult.msg || 'Failed to add list to new location');
      }
    } catch (error) {
      console.error('Error moving list:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to move list',
        variant: 'destructive',
      });
    }
  };

  // Function to get available folders when a project is selected
  const getAvailableFolders = (projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    if (project && project.subProjects) {
      const folders = project.subProjects.filter(subProject => subProject.icon === FolderOpen);
      setAvailableFolders(folders);
    } else {
      setAvailableFolders([]);
    }
  };

  // Handle project selection for move
  const handleProjectSelectionForMove = (projectId: string) => {
    setTargetProjectId(projectId);
    setTargetFolderId(""); // Reset folder selection
    setSelectedTargetFolder(null);
    getAvailableFolders(projectId);
  };

  // Handle folder selection for move
  const handleFolderSelectionForMove = (folder: any) => {
    console.log('Folder selected for move:', folder);
    setTargetFolderId(folder._id);
    setSelectedTargetFolder(folder);
    // Note: targetProjectId should remain set from the project selection
    console.log('Current move state - Project ID:', targetProjectId, 'Folder ID:', folder._id);
  };

  return (
    <>
      {/* Add Project Dialog */}
      <Dialog open={openAddProjectDialog} onOpenChange={setOpenAddProjectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your work.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProject}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Input
                  id="project-name"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim()) {
                      e.preventDefault()
                      handleAddProject(e)
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddProjectDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newProjectName.trim()}
                className="bg-black text-white hover:bg-gray-800"
              >
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Folder Dialog */}
      <Dialog
        open={openAddFolderDialog}
        onOpenChange={setOpenAddFolderDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Folder</DialogTitle>
            <DialogDescription>
              {selectedProjectId ?
                `Create a new folder in ${projects.find(p => p._id === selectedProjectId)?.name || 'this project'}.` :
                'Create a new folder in a project.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFolder}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                {!selectedProjectId && (
                  <div className="col-span-4">
                    <label htmlFor="project-select" className="text-sm font-medium mb-2 block">
                      Select Project
                    </label>
                    <select
                      id="project-select"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Input
                  id="folder-name"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim() && selectedProjectId) {
                      e.preventDefault()
                      handleAddFolder(e)
                    }
                  }}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddFolderDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newFolderName.trim() || !selectedProjectId}
                className="bg-black text-white hover:bg-gray-800"
              >
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add List Dialog */}
      <Dialog
        open={openAddListDialog}
        onOpenChange={setOpenAddListDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New List</DialogTitle>
            <DialogDescription>
              {selectedProjectId ?
                `Create a new list in ${projects.find(p => p._id === selectedProjectId)?.name || 'this project'}.` :
                'Create a new list in a project.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddList}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                {!selectedProjectId && (
                  <div className="col-span-4">
                    <label htmlFor="project-select-list" className="text-sm font-medium mb-2 block">
                      Select Project
                    </label>
                    <select
                      id="project-select-list"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Input
                  id="list-name"
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListName.trim() && selectedProjectId) {
                      e.preventDefault()
                      handleAddList(e)
                    }
                  }}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddListDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newListName.trim() || !selectedProjectId}
                className="bg-black text-white hover:bg-gray-800"
              >
                Create List
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add List to Folder Dialog */}
      <Dialog
        open={openAddListToFolderDialog}
        onOpenChange={setOpenAddListToFolderDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New List to Folder</DialogTitle>
            <DialogDescription>
              {selectedFolderId ?
                `Create a new list in the selected folder.` :
                'Create a new list in a folder.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddListToFolder}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Input
                  id="list-name-folder"
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListName.trim() && selectedFolderId) {
                      e.preventDefault()
                      handleAddListToFolder(e)
                    }
                  }}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setOpenAddListToFolderDialog(false);
                setSelectedFolderId("");
                setNewListName("");
              }}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newListName.trim() || !selectedFolderId}
                className="bg-black text-white hover:bg-gray-800"
              >
                Create List in Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Space Dialog */}
      <Dialog
        open={openRenameSpaceDialog}
        onOpenChange={setOpenRenameSpaceDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Space</DialogTitle>
            <DialogDescription>
              Enter a new name for this space.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSpace}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Input
                  id="space-name"
                  placeholder="Space name"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSpaceName.trim()) {
                      e.preventDefault()
                      handleRenameSpace(e)
                    }
                  }}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenRenameSpaceDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newSpaceName.trim()}
                className="bg-black text-white hover:bg-gray-800"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog
        open={openRenameFolderDialog}
        onOpenChange={setOpenRenameFolderDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameFolder}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Input
                  id="folder-rename"
                  placeholder="Folder name"
                  value={newFolderNameForRename}
                  onChange={(e) => setNewFolderNameForRename(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderNameForRename.trim()) {
                      e.preventDefault()
                      handleRenameFolder(e)
                    }
                  }}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenRenameFolderDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newFolderNameForRename.trim()}
                className="bg-black text-white hover:bg-gray-800"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename List Dialog */}
      <Dialog
        open={openRenameListDialog}
        onOpenChange={setOpenRenameListDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename List</DialogTitle>
            <DialogDescription>
              Enter a new name for this list.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameList}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Input
                  id="list-rename"
                  placeholder="List name"
                  value={newListNameForRename}
                  onChange={(e) => setNewListNameForRename(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListNameForRename.trim()) {
                      e.preventDefault()
                      handleRenameList(e)
                    }
                  }}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenRenameListDialog(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newListNameForRename.trim()}
                className="bg-black text-white hover:bg-gray-800"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Sharing Sheet */}
      <Sheet open={openProjectSharingSheet} onOpenChange={setOpenProjectSharingSheet}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>Project Sharing</SheetTitle>
            <SheetDescription>
              Manage who can access this project.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Add user section */}
           

            {/* User permissions table */}
            <div className="space-y-3">
              <Label>People with access</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>None</TableHead>
                    <TableHead>Own Records</TableHead>
                    <TableHead>All Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id || user._id}>
                      <TableCell>
                        {user.name}
                      </TableCell>
                      <RadioGroup
                        value={user.permission}
                        onValueChange={(value) => updateUserPermission(user.id || user._id, value)}
                        className="contents"
                      >
                        <TableCell className="text-center">
                          <RadioGroupItem value="none" id={`project-none-${user.id || user._id}`} />
                        </TableCell>
                        <TableCell className="text-center">
                          <RadioGroupItem value="own" id={`project-own-${user.id || user._id}`} />
                        </TableCell>
                        <TableCell className="text-center">
                          <RadioGroupItem value="all" id={`project-all-${user.id || user._id}`} />
                        </TableCell>
                      </RadioGroup>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpenProjectSharingSheet(false)}>
              Cancel
            </Button>
{/*             <Button onClick={savePermissions} className="bg-black text-white hover:bg-gray-800">
              Save Permissions
            </Button> */}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Folder Sharing Sheet */}
      <Sheet open={openFolderSharingSheet} onOpenChange={setOpenFolderSharingSheet}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>Folder Sharing</SheetTitle>
            <SheetDescription>
              Manage who can access this folder.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Add user section */}
           

            {/* User permissions table */}
            <div className="space-y-3">
              <Label>People with access</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>None</TableHead>
                    <TableHead>Own Records</TableHead>
                    <TableHead>All Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id || user._id}>
                      <TableCell>
                        {user.name}
                      </TableCell>
                      <RadioGroup
                        value={user.permission}
                        onValueChange={(value) => updateUserPermission(user.id || user._id, value)}
                        className="contents"
                      >
                        <TableCell className="text-center">
                          <RadioGroupItem value="none" id={`folder-none-${user.id || user._id}`} />
                        </TableCell>
                        <TableCell className="text-center">
                          <RadioGroupItem value="own" id={`folder-own-${user.id || user._id}`} />
                        </TableCell>
                        <TableCell className="text-center">
                          <RadioGroupItem value="all" id={`folder-all-${user.id || user._id}`} />
                        </TableCell>
                      </RadioGroup>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpenFolderSharingSheet(false)}>
              Cancel
            </Button>
            {/* <Button onClick={savePermissions} className="bg-black text-white hover:bg-gray-800">
              Save Permissions
            </Button> */}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* List Sharing Sheet */}
      <Sheet open={openListSharingSheet} onOpenChange={setOpenListSharingSheet}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>List Sharing</SheetTitle>
            <SheetDescription>
              Manage who can access this list.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Add user section */}
            

            {/* User permissions table */}
            <div className="space-y-3">
              <Label>People with access</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>None</TableHead>
                    <TableHead>Own Records</TableHead>
                    <TableHead>All Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id || user._id}>
                      <TableCell>
                        {user.name}
                      </TableCell>
                      <RadioGroup
                        value={user.permission}
                        onValueChange={(value) => updateUserPermission(user.id || user._id, value)}
                        className="contents"
                      >
                        <TableCell className="text-center">
                          <RadioGroupItem value="none" id={`list-none-${user.id || user._id}`} />
                        </TableCell>
                        <TableCell className="text-center">
                          <RadioGroupItem value="own" id={`list-own-${user.id || user._id}`} />
                        </TableCell>
                        <TableCell className="text-center">
                          <RadioGroupItem value="all" id={`list-all-${user.id || user._id}`} />
                        </TableCell>
                      </RadioGroup>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpenListSharingSheet(false)}>
              Cancel
            </Button>
            {/* <Button onClick={savePermissions} className="bg-black text-white hover:bg-gray-800">
              Save Permissions
            </Button> */}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedItemType ? `Delete ${selectedItemType === 'space' ? 'Project' : 
                                 selectedItemType === 'folder' ? 'Folder' : 'List'}` : 'Delete Item'}
            </DialogTitle>
            <DialogDescription>
              {selectedItemType ? 
                `Are you sure you want to delete this ${selectedItemType} and its tasks?` : 
                'Are you sure you want to delete this item?'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-destructive">
              This action cannot be undone. This will permanently delete the {selectedItemType || 'item'}
              and all of its associated data.
            </p>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpenDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={!selectedItemId || !selectedItemType || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move List Sheet */}
      <Sheet open={openMoveListSheet} onOpenChange={setOpenMoveListSheet}>
        <SheetContent className="sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Move List</SheetTitle>
            <SheetDescription>
              Select where to move "{selectedItemName}"
            </SheetDescription>
          </SheetHeader>

          <div className="py-6">
            <div className="space-y-4">
              {/* Project Selection */}
              <div>
                <Label htmlFor="project-select-move" className="text-sm font-medium mb-2 block">
                  Select Project
                </Label>
                <Select
                  value={targetProjectId}
                  onValueChange={handleProjectSelectionForMove}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Folder Selection - only show if a project is selected */}
              {targetProjectId && availableFolders.length > 0 && (
                <div>
                  <Label htmlFor="folder-select-move" className="text-sm font-medium mb-2 block">
                    Select Folder (Optional)
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {availableFolders.map((folder) => (
                      <div
                        key={folder._id}
                        className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 ${
                          targetFolderId === folder._id ? 'bg-blue-100 border border-blue-300' : ''
                        }`}
                        onClick={() => handleFolderSelectionForMove(folder)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        <span className="text-sm">{folder.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave unselected to move directly to the project
                  </p>
                </div>
              )}

              {/* Selected destination display */}
              {targetProjectId && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <Label className="text-sm font-medium">Destination:</Label>
                  <div className="text-sm text-gray-600 mt-1">
                    {projects.find(p => p._id === targetProjectId)?.name}
                    {selectedTargetFolder && (
                      <span> → {selectedTargetFolder.name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => {
              setOpenMoveListSheet(false);
              setTargetProjectId("");
              setTargetFolderId("");
              setSelectedTargetFolder(null);
              setAvailableFolders([]);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log('Move button clicked');
                console.log('Current move state:', {
                  selectedItemId,
                  selectedItemName,
                  targetProjectId,
                  targetFolderId,
                  selectedTargetFolder
                });
                handleMoveList();
              }}
              disabled={!targetProjectId}
              className="bg-black text-white hover:bg-gray-800"
            >
              Move List
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Duplicate List Sheet */}
      <DuplicateListDrawer
        open={openDuplicateListSheet}
        onOpenChange={(open) => {
          setOpenDuplicateListSheet(open);
          // If the sheet is being closed, refresh the projects list
          if (!open) {
            refreshProjects();
          }
        }}
        listName={selectedItemName}
        listId={selectedItemId}
      />

      {/* List Statuses Sheet */}
      <ListStatusesSheet
        open={openListStatusesSheet}
        onOpenChange={setOpenListStatusesSheet}
        projectName={selectedItemName}
        listId={selectedItemId}
      />

      {/* Custom Fields Sheet */}
      {(
        <CustomFieldsSheet
          open={openCustomFieldsSheet}
          onOpenChange={setOpenCustomFieldsSheet}
          projectName={selectedItemName}
          listId={selectedItemId}
        />
      )}

      {mounted && (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden" ref={containerRef}>
        <div className="flex items-center justify-between px-2">
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          {(
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-muted"
              onClick={() => setOpenAddProjectDialog(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Project</span>
            </Button>
          )}
        </div>
        <SidebarMenu>
        {visibleItems.map((item) => {
          const isParentActive = findParentActive(item.subProjects)
          return (
            <SidebarMenuItem key={item.name}>
              <Collapsible open={openProjects.includes(item.name)} onOpenChange={() => toggleProject(item.name)}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton asChild>
                    <a href={item.url || '#'} className={`group flex items-center justify-between ${isParentActive ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
                      <div className="flex items-center overflow-hidden">
                        <ChevronRight
                          className={`mr-2 h-4 w-4 flex-shrink-0 transition-transform duration-200 ${openProjects.includes(item.name) ? "rotate-90" : ""}`}
                        />
                        <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate" title={item.name}>
                          {truncateText(item.name, 20)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {(
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 opacity-100 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">Add</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {(
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  // Set the project ID first, then open the dialog
                                  setSelectedProjectId(item._id);
                                  setTimeout(() => setOpenAddFolderDialog(true), 0);
                                }}>
                                  <FolderOpen className="mr-2 h-4 w-4" />
                                  <span>Add Folder</span>
                                </DropdownMenuItem>
                              )}
                              {(
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  // Set the project ID first, then open the dialog
                                  setSelectedProjectId(item._id);
                                  setTimeout(() => setOpenAddListDialog(true), 0);
                                }}>
                                  <ListIcon className="mr-2 h-4 w-4" />
                                  <span>Add List to Project</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {(
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 opacity-100 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                // Set up for renaming space
                                setSelectedItemId(item._id);
                                setSelectedItemName(item.name);
                                setSelectedItemType('space');
                                setNewSpaceName(item.name);
                                setTimeout(() => setOpenRenameSpaceDialog(true), 0);
                              }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Rename</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                // Set up for project sharing
                                setCurrentSpaceId(item._id);
                                setSelectedProjectId(item._id);
                                setSelectedItemName(item.name);
                                setSelectedItemType('space');
                                setOpenProjectSharingSheet(true);
                              }}>
                                <Share2 className="mr-2 h-4 w-4" />
                                <span>Share</span>
                              </DropdownMenuItem>
                              {(
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  // Set up for project deletion
                                  setSelectedItemId(item._id);
                                  setSelectedItemName(item.name);
                                  setSelectedItemType('space');
                                  setTimeout(() => setOpenDeleteDialog(true), 0);
                                }}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </a>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.subProjects?.map((subProject) => {
                      const isSubActive = isListActive(subProject.url) || findParentActive(subProject.subProjects)

                      // Check if this is a list (has ListIcon) or a folder (has FolderOpen icon)
                      const isListItem = subProject.icon === ListIcon

                      // If it's a list item, render it with dropdown menu
                      if (isListItem) {
                        return (
                          <SidebarMenuSubItem key={subProject.name}>
                            <SidebarMenuSubButton asChild>
                              <a href={subProject.url || '#'} className={`flex items-center justify-between ${isSubActive ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
                                <div className="flex items-center">
                                  <subProject.icon className="mr-2 h-3 w-3 flex-shrink-0" />
                                  <span className="truncate" title={subProject.name}>
                                    {truncateText(subProject.name, 15)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {(
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-3 w-3 p-0 opacity-100 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
                                          <span className="sr-only">More</span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                          e.preventDefault();
                                          // Set up for renaming list
                                          setSelectedItemId(subProject._id);
                                          setSelectedItemName(subProject.name);
                                          setSelectedItemType('list');
                                          setNewListNameForRename(subProject.name);
                                          setTimeout(() => setOpenRenameListDialog(true), 0);
                                        }}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          <span>Rename</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                          e.preventDefault();
                                          // Set up for sharing list
                                          setCurrentSpaceId(subProject._id);
                                          setSelectedItemId(subProject._id);
                                          setSelectedItemName(subProject.name);
                                          setSelectedItemType('list');
                                          setOpenListSharingSheet(true);
                                        }}>
                                          <Share2 className="mr-2 h-4 w-4" />
                                          <span>Share</span>
                                        </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                          e.preventDefault();
                                          // Set up for moving list
                                          setSelectedItemId(subProject._id);
                                          setSelectedItemName(subProject.name);
                                          setSelectedItemType('list');
                                          setTimeout(() => setOpenMoveListSheet(true), 0);
                                        }}>
                                           <MoveRight className="mr-2 h-4 w-4" />
                                          <span>Move</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                          e.preventDefault();
                                          // Set up for duplicating list
                                          setSelectedItemId(subProject._id);
                                          setSelectedItemName(subProject.name);
                                          setSelectedItemType('list');
                                          setTimeout(() => setOpenDuplicateListSheet(true), 0);
                                        }}>
                                         <Copy className="mr-2 h-4 w-4" />
                                        <span>Duplicate</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                        e.preventDefault();
                                        // Set up for list statuses
                                        setSelectedItemId(subProject._id);
                                        setSelectedItemName(subProject.name);
                                        setSelectedItemType('list');
                                        setTimeout(() => setOpenListStatusesSheet(true), 0);
                                      }}>
                                        <Layers className="mr-2 h-4 w-4" />
                                        <span>Statuses</span>
                                      </DropdownMenuItem>
                                      {(
                                        <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                          e.preventDefault();
                                          // Set up for custom fields
                                          setSelectedItemId(subProject._id);
                                          setSelectedItemName(subProject.name);
                                          setSelectedItemType('list');
                                          setTimeout(() => setOpenCustomFieldsSheet(true), 0);
                                        }}>
                                          <FileText className="mr-2 h-4 w-4" />
                                          <span>Custom Fields</span>
                                        </DropdownMenuItem>
                                      )}
                                      {(
                                        <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                          e.preventDefault();
                                          // Set up for deleting list
                                          setSelectedItemId(subProject._id);
                                          setSelectedItemName(subProject.name);
                                          setSelectedItemType('list');
                                          setTimeout(() => setOpenDeleteDialog(true), 0);
                                        }}>
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          <span>Delete</span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                </div>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      }

                      // For folders, render with collapsible and dropdown menus
                      return (
                        <Collapsible key={subProject.name} open={openFolders.includes(subProject._id)} onOpenChange={() => toggleFolder(subProject._id)}>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild>
                                <a href={subProject.url || '#'} className={`flex items-center justify-between ${isSubActive ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
                                  <div className="flex items-center">
                                    <ChevronRight
                                      className={`mr-2 h-3 w-3 flex-shrink-0 transition-transform duration-200 ${
                                        openFolders.includes(subProject._id) ? "rotate-90" : ""
                                      }`}
                                    />
                                    <subProject.icon className="mr-2 h-3 w-3 flex-shrink-0" />
                                    <span className="truncate" title={subProject.name}>
                                      {truncateText(subProject.name, 15)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {(
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-3 w-3 p-0 opacity-100 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                                          >
                                            <Plus className="h-3 w-3" />
                                            <span className="sr-only">Add</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                            e.preventDefault();
                                            // Set the folder ID first, then open the dialog
                                            setSelectedFolderId(subProject._id);
                                            setTimeout(() => setOpenAddListToFolderDialog(true), 0);
                                          }}>
                                            <ListIcon className="mr-2 h-4 w-4" />
                                            <span>Add List to Folder</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}

                                    {(
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-3 w-3 p-0 opacity-100 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                                          >
                                            <MoreHorizontal className="h-3 w-3" />
                                            <span className="sr-only">More</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                            e.preventDefault();
                                            // Set up for renaming folder
                                            setSelectedItemId(subProject._id);
                                            setSelectedItemName(subProject.name);
                                            setSelectedItemType('folder');
                                            setNewFolderNameForRename(subProject.name);
                                            setTimeout(() => setOpenRenameFolderDialog(true), 0);
                                          }}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            <span>Rename</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                            e.preventDefault();
                                            // Set up for folder sharing
                                            setCurrentSpaceId(subProject._id);
                                            setSelectedFolderId(subProject._id);
                                            setSelectedItemName(subProject.name);
                                            setSelectedItemType('folder');
                                            setOpenFolderSharingSheet(true);
                                          }}>
                                            <Share2 className="mr-2 h-4 w-4" />
                                            <span>Folder sharing</span>
                                          </DropdownMenuItem>
                                          {(
                                            <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                              e.preventDefault();
                                              // Set up for folder deletion
                                              setSelectedItemId(subProject._id);
                                              setSelectedItemName(subProject.name);
                                              setSelectedItemType('folder');
                                              setTimeout(() => setOpenDeleteDialog(true), 0);
                                            }}>
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              <span>Delete</span>
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </CollapsibleTrigger>
                          {subProject.subProjects && (
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {subProject.subProjects.map((nestedProject) => (
                                  <SidebarMenuSubItem key={nestedProject.name}>
                                    <SidebarMenuSubButton asChild>
                                      <a href={nestedProject.url || '#'} className={`flex items-center justify-between ${isListActive(nestedProject.url) ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
                                        <div className="flex items-center">
                                          <nestedProject.icon className="mr-2 h-3 w-3 flex-shrink-0" />
                                          <span className="truncate" title={nestedProject.name}>
                                            {truncateText(nestedProject.name, 12)}
                                          </span>
                                        </div>
                                                                                <div className="flex items-center space-x-1">
                                          {(
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-3 w-3 p-0 opacity-100 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                                                >
                                                  <MoreHorizontal className="h-3 w-3" />
                                                  <span className="sr-only">More</span>
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                                  e.preventDefault();
                                                  // Set up for renaming list
                                                  setSelectedItemId(nestedProject._id);
                                                  setSelectedItemName(nestedProject.name);
                                                  setSelectedItemType('list');
                                                  setNewListNameForRename(nestedProject.name);
                                                  setTimeout(() => setOpenRenameListDialog(true), 0);
                                                }}>
                                                  <Pencil className="mr-2 h-4 w-4" />
                                                  <span>Rename</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                                  e.preventDefault();
                                                  // Set up for sharing list
                                                  setCurrentSpaceId(nestedProject._id);
                                                  setSelectedItemId(nestedProject._id);
                                                  setSelectedItemName(nestedProject.name);
                                                  setSelectedItemType('list');
                                                  setOpenListSharingSheet(true);
                                                }}>
                                                  <Share2 className="mr-2 h-4 w-4" />
                                                  <span>Share</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                                  e.preventDefault();
                                                  // Set up for moving list
                                                  setSelectedItemId(nestedProject._id);
                                                  setSelectedItemName(nestedProject.name);
                                                  setSelectedItemType('list');
                                                  setTimeout(() => setOpenMoveListSheet(true), 0);
                                                }}>
                                                  <MoveRight className="mr-2 h-4 w-4" />
                                                  <span>Move</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                                  e.preventDefault();
                                                  // Set up for duplicating list
                                                  setSelectedItemId(nestedProject._id);
                                                  setSelectedItemName(nestedProject.name);
                                                  setSelectedItemType('list');
                                                  setTimeout(() => setOpenDuplicateListSheet(true), 0);
                                                }}>
                                                 <Copy className="mr-2 h-4 w-4" />
                                                  <span>Duplicate</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                                  e.preventDefault();
                                                  // Set up for list statuses
                                                  setSelectedItemId(nestedProject._id);
                                                  setSelectedItemName(nestedProject.name);
                                                  setSelectedItemType('list');
                                                  setTimeout(() => setOpenListStatusesSheet(true), 0);
                                                }}>
                                                  <Layers className="mr-2 h-4 w-4" />
                                                  <span>Statuses</span>
                                                </DropdownMenuItem>
                                                {(
                                                  <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                                    e.preventDefault();
                                                    // Set up for custom fields
                                                    setSelectedItemId(nestedProject._id);
                                                    setSelectedItemName(nestedProject.name);
                                                    setSelectedItemType('list');
                                                    setTimeout(() => setOpenCustomFieldsSheet(true), 0);
                                                  }}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    <span>Custom Fields</span>
                                                  </DropdownMenuItem>
                                                )}
                                                {(
                                                  <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                                                    e.preventDefault();
                                                    // Set up for deleting list
                                                    setSelectedItemId(nestedProject._id);
                                                    setSelectedItemName(nestedProject.name);
                                                    setSelectedItemType('list');
                                                    setTimeout(() => setOpenDeleteDialog(true), 0);
                                                  }}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete</span>
                                                  </DropdownMenuItem>
                                                )}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          )}
                                        </div>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          )}
                        </Collapsible>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
      )}
    </>
  )
}
