
export interface Manga {
    id?: string; // auto-generated by Firebase
    title: string;
    status: 'to_read' | 'in_progress' | 'finished' | string;
    priority?: number;
    lastChapterRead?: number;
    releasedChapters?: number;
    isEditing?: boolean;
    isEditingStatus?: boolean;
    hot?: boolean;
    isPublicationStopped?: boolean;
}
