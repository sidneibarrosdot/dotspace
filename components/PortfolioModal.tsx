import React, { useEffect, useState } from 'react';
import type { PortfolioItem } from '../types';
import { db, auth } from '../firebase';
import { doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp, increment } from 'firebase/firestore';
import DotLogo from './DotLogo';
import { logAudit } from '../services/auditService';
import { User } from 'firebase/auth';
import { HeartIcon, EyeIcon, Bookmark } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../services/firestoreErrorHandler';

interface PortfolioModalProps {
  item: PortfolioItem;
  onClose: () => void;
  isCreating?: boolean;
  isLoggedIn?: boolean;
  user?: User | null;
  onUpdate?: (item: PortfolioItem) => void;
  onAdd?: (item: PortfolioItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (item: PortfolioItem) => void;
  isFavorited?: boolean;
  onLike?: (item: PortfolioItem) => void;
  isLiked?: boolean;
  theme: 'light' | 'dark';
}

const getGoogleSlidesPreviewUrl = (url: string): string | null => {
    if (typeof url !== 'string' || !url.includes('docs.google.com/presentation/d/')) {
        return null;
    }
    
    // Extract the base URL without parameters
    const baseUrl = url.split('?')[0];
    
    // If it's already a published/embed link, convert to pubembed format
    if (baseUrl.endsWith('/pub') || baseUrl.endsWith('/embed') || baseUrl.endsWith('/pubembed')) {
        const cleanBase = baseUrl.replace(/\/(pub|embed|pubembed)$/, '');
        return `${cleanBase}/pubembed?start=false&loop=false&delayms=3000`;
    }

    // Match the base URL including the presentation ID, handling both /d/ID and /d/e/ID
    const match = url.match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
        const id = match[1];
        const isE = url.includes('/d/e/');
        return `https://docs.google.com/presentation/d/${isE ? 'e/' : ''}${id}/pubembed?start=false&loop=false&delayms=3000`;
    }
    return null;
};

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);
  
// Reusable display components
const DetailList = ({ title, items }: { title: string; items: string[] }) => (
    <div>
        <h4 className="text-md font-semibold text-accent mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
            {items.map((tag) => (
                <span key={tag} className="bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
                    {tag}
                </span>
            ))}
        </div>
    </div>
);

const DetailItem = ({ label, value }: { label: string; value: string }) => (
    <div>
        <h4 className="text-md font-semibold text-accent mb-1">{label}</h4>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{value}</p>
    </div>
);

// Reusable field component
const EditableField = ({ 
    label, 
    name, 
    value, 
    isEditing,
    isArray = false, 
    isTextArea = false,
    onChange
}: { 
    label: string; 
    name: keyof PortfolioItem; 
    value: any; 
    isEditing: boolean;
    isArray?: boolean; 
    isTextArea?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) => {
    if (isEditing) {
        const inputValue = value || '';
        
        return (
            <div>
                <label htmlFor={name} className="block text-sm font-semibold text-accent mb-1">{label}</label>
                {isTextArea || isArray ? (
                    <textarea
                        id={name}
                        name={name}
                        value={inputValue}
                        onChange={onChange}
                        rows={3}
                        className="w-full text-sm p-2 bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-accent focus:border-accent transition-colors"
                    />
                ) : (
                    <input
                        type="text"
                        id={name}
                        name={name}
                        value={inputValue}
                        onChange={onChange}
                        className="w-full text-sm p-2 bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md focus:ring-accent focus:border-accent transition-colors"
                    />
                )}
            </div>
        );
    }
    
    if (!value || (isArray && value.length === 0)) return null;
    
    // If it's an array field but stored as a string, split it
    let items: string[] = [];
    if (isArray) {
        if (typeof value === 'string') {
            items = value.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(value)) {
            items = value.flatMap(v => typeof v === 'string' ? v.split(/[;,]/).map(s => s.trim()).filter(Boolean) : String(v));
        }
    }
    
    return isArray ? <DetailList title={label} items={items} /> : <DetailItem label={label} value={value} />;
};

const PortfolioModal: React.FC<PortfolioModalProps> = ({ item, onClose, isCreating = false, isLoggedIn = false, user = null, onUpdate, onAdd, onDelete, onToggleFavorite, isFavorited, onLike, isLiked, theme }) => {
    const [isEditing, setIsEditing] = useState(isCreating);
    const [editableItem, setEditableItem] = useState<PortfolioItem>(item);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [imgError, setImgError] = useState(false);
    

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
              onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
    
        return () => {
          window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    useEffect(() => {
        setEditableItem(item);
        setIsEditing(isCreating);
        setIsConfirmingDelete(false); // Reset confirmation on item change
        setSaveError('');
        setImgError(false);
    }, [item, isCreating]);

    if (!editableItem) return null;
    
    const modalTitle = isCreating ? "Adicionar Novo Projeto" : isEditing ? "Editar Projeto" : item.Projeto;

    const handleEditToggle = () => {
        if (isEditing) {
            setEditableItem(item); // Discard changes if canceling
        }
        setIsEditing(!isEditing);
        setIsConfirmingDelete(false); // Reset on toggle
        setSaveError('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditableItem(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaveError('');
        if (!editableItem.Projeto?.trim() || !editableItem.Cliente?.trim()) {
            setSaveError("Nome do projeto e Cliente são obrigatórios.");
            return;
        }
        setIsSaving(true);
        try {
            // Clean up array fields before saving
            const cleanedItem = { ...editableItem };
            (Object.keys(cleanedItem) as Array<keyof PortfolioItem>).forEach(key => {
                if (typeof cleanedItem[key] === 'string') {
                    (cleanedItem[key] as any) = (cleanedItem[key] as string).trim();
                }
            });
            
            const { id, ...dataToSave } = cleanedItem;
            
            // Auto-generate cover image from Google Slides link if no image is provided (for new projects)
            // OR if it's already a Google Slides link (to keep it updated/normalized).
            // For existing projects, if the user clears the field, we respect that.
            const isGoogleSlidesLink = cleanedItem.Imagem_capa && cleanedItem.Imagem_capa.includes('docs.google.com/presentation/d/');
            const shouldAutoGenerate = (!id && !cleanedItem.Imagem_capa) || isGoogleSlidesLink;

            if (shouldAutoGenerate && cleanedItem.Link_PMV) {
                const previewUrl = getGoogleSlidesPreviewUrl(cleanedItem.Link_PMV);
                if (previewUrl) {
                    cleanedItem.Imagem_capa = previewUrl;
                    (dataToSave as any).Imagem_capa = previewUrl; // Update dataToSave as well
                } else if (isGoogleSlidesLink) {
                    // If the link is no longer a valid slides link, remove the old auto-generated image URL.
                    cleanedItem.Imagem_capa = '';
                    (dataToSave as any).Imagem_capa = '';
                }
            }

            if (id) { // UPDATE existing project
                const path = `projects/${id}`;
                try {
                    const projectRef = doc(db, 'projects', id);
                    await updateDoc(projectRef, dataToSave);
                    await logAudit('UPDATE', `Editou projeto: ${cleanedItem.Projeto}`, user);
                    if (onUpdate) onUpdate(cleanedItem);
                } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, path);
                }
            } else { // CREATE new project
                const path = 'projects';
                try {
                    const docRef = await addDoc(collection(db, path), dataToSave);
                    const newProject = { ...cleanedItem, id: docRef.id };
                    await logAudit('CREATE', `Criou projeto: ${cleanedItem.Projeto}`, user);
                    if (onAdd) onAdd(newProject);
                } catch (error) {
                    handleFirestoreError(error, OperationType.CREATE, path);
                }
            }
            setIsEditing(false);
            onClose();
        } catch (error: any) {
            console.error("Error saving document: ", error);
            if (error.code === 'permission-denied') {
                const path = editableItem.id ? `projects/${editableItem.id}` : 'projects';
                const op = editableItem.id ? OperationType.UPDATE : OperationType.CREATE;
                handleFirestoreError(error, op, path);
            }
            setSaveError("Falha ao salvar. Verifique suas permissões.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteInitiate = () => {
        setIsConfirmingDelete(true);
    };

    const handleConfirmDelete = async () => {
        if (!item.id || !onDelete) return;
        setIsDeleting(true);
        try {
            const projectRef = doc(db, 'projects', item.id);
            try {
                await deleteDoc(projectRef);
            } catch (error: any) {
                if (error.code === 'permission-denied') {
                    handleFirestoreError(error, OperationType.DELETE, `projects/${item.id}`);
                }
                throw error;
            }
            await logAudit('DELETE', `Excluiu projeto: ${item.Projeto}`, user);
            onDelete(item.id);
            onClose();
        } catch (error) {
            console.error("Error deleting document: ", error);
            setSaveError("Falha ao excluir o projeto. Tente novamente.");
        } finally {
            setIsDeleting(false);
            setIsConfirmingDelete(false);
        }
    };



    return (
        <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors z-10"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div>
                    <div className="relative w-full aspect-video bg-gray-100 dark:bg-zinc-700 rounded-t-lg">
                        {editableItem.Imagem_capa && editableItem.Imagem_capa.includes('docs.google.com/presentation/d/') ? (
                            <div className="w-full h-full relative">
                                <iframe 
                                    src={editableItem.Imagem_capa} 
                                    title={editableItem.Projeto} 
                                    className="w-full h-full rounded-t-lg" 
                                    frameBorder="0" 
                                    allowFullScreen
                                />
                            </div>
                        ) : editableItem.Imagem_capa && !imgError ? (
                            <img 
                                src={editableItem.Imagem_capa} 
                                alt={editableItem.Projeto} 
                                className="w-full h-full object-cover rounded-t-lg" 
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-zinc-900">
                                <DotLogo 
                                    theme={theme} 
                                    className="h-24 w-auto opacity-10 dark:opacity-60 object-contain" 
                                />
                            </div>
                        )}
                        {isEditing && (
                             <div className="absolute bottom-0 left-0 w-full p-4 bg-black/50">
                                <EditableField 
                                    label="URL da Imagem" 
                                    name="Imagem_capa" 
                                    value={editableItem.Imagem_capa} 
                                    isEditing={isEditing}
                                    onChange={handleChange}
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="p-8">
                        <div className="flex items-start justify-between mb-8">
                             <div className="w-full pr-2">
                                {isEditing ? (
                                    <EditableField 
                                        label="Nome do Projeto" 
                                        name="Projeto" 
                                        value={editableItem.Projeto} 
                                        isEditing={isEditing}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <h2 id="modal-title" className="text-3xl font-bold text-zinc-900 dark:text-white">{modalTitle}</h2>
                                )}
                             </div>
                            
                            {isLoggedIn && !isCreating && (
                                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                    <button 
                                        onClick={handleEditToggle} 
                                        className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                                        aria-label="Edit project"
                                    >
                                        <EditIcon className="w-6 h-6" />
                                    </button>
                                    <button 
                                        onClick={handleDeleteInitiate} 
                                        className="p-2 rounded-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        aria-label="Delete project"
                                    >
                                        <TrashIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {!isEditing && !isCreating && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <EyeIcon className="w-4 h-4" />
                                        <span>{editableItem.views || 0} visualizações</span>
                                    </div>
                                    <button 
                                        onClick={async () => {
                                            if (onLike) onLike(editableItem);
                                        }}
                                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                                            isLiked ? 'text-accent' : 'hover:text-accent'
                                        }`}
                                        title={isLiked ? "Descurtir" : "Curtir"}
                                    >
                                        <HeartIcon className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                        <span>{editableItem.likes || 0} curtidas</span>
                                    </button>
                                    
                                    {isLoggedIn && onToggleFavorite && (
                                        <button 
                                            onClick={() => onToggleFavorite(editableItem)}
                                            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                                                isFavorited ? 'text-accent' : 'hover:text-accent'
                                            }`}
                                        >
                                            <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                                            <span>{isFavorited ? 'Salvo nos Favoritos' : 'Salvar para ver depois'}</span>
                                        </button>
                                    )}
                                </div>
                                
                                {editableItem.Link_PMV && editableItem.Link_PMV !== '#' && (
                                    <a 
                                        href={editableItem.Link_PMV} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-dark text-white dark:text-zinc-900 font-bold rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                    >
                                        Acessar PMV
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                            {/* Column 1 */}
                            <div className="space-y-6">
                                <EditableField label="Time" name="Time" value={editableItem.Time} isEditing={isEditing} onChange={handleChange} />
                                <EditableField label="Cliente" name="Cliente" value={editableItem.Cliente} isEditing={isEditing} onChange={handleChange} />
                                <EditableField label="Data" name="Data" value={editableItem.Data} isEditing={isEditing} onChange={handleChange} />
                                <EditableField label="DI" name="DI" value={editableItem.DI} isEditing={isEditing} onChange={handleChange} />
                                <EditableField label="DM" name="DM" value={editableItem.DM} isEditing={isEditing} onChange={handleChange} />
                                {isEditing && <EditableField label="Link PMV" name="Link_PMV" value={editableItem.Link_PMV} isEditing={isEditing} onChange={handleChange} />}
                            </div>
                            
                            {/* Column 2 */}
                            <div className="space-y-6 mt-6 sm:mt-0">
                                <EditableField label="Assunto geral" name="Assunto_geral" value={editableItem.Assunto_geral} isEditing={isEditing} onChange={handleChange} isArray />
                                <EditableField label="Assunto específico" name="Assunto_especifico" value={editableItem.Assunto_especifico} isEditing={isEditing} onChange={handleChange} isArray />
                                <EditableField label="Público-alvo" name="Publico_alvo" value={editableItem.Publico_alvo} isEditing={isEditing} onChange={handleChange} isArray />
                                <EditableField label="Metodologias" name="Metodologias" value={editableItem.Metodologias} isEditing={isEditing} onChange={handleChange} isArray />
                                <EditableField label="Mídias" name="Mídias" value={editableItem.Mídias} isEditing={isEditing} onChange={handleChange} isArray />
                                <EditableField label="Outros recursos" name="Outros_recursos" value={editableItem.Outros_recursos} isEditing={isEditing} onChange={handleChange} isArray />
                            </div>
                        </div>

                        {(isEditing || isConfirmingDelete) ? (
                            <div className="pt-8 flex flex-col items-end gap-3">
                                {saveError && <p className="text-sm text-red-500 w-full text-right">{saveError}</p>}
                                <div className="flex w-full items-center justify-between">
                                    {isConfirmingDelete ? (
                                        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20">
                                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Deseja excluir este projeto permanentemente?</p>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => setIsConfirmingDelete(false)} 
                                                    className="text-sm font-bold bg-white dark:bg-zinc-800 px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors border border-gray-200 dark:border-zinc-700"
                                                    disabled={isDeleting}
                                                >
                                                    Cancelar
                                                </button>
                                                <button 
                                                    onClick={handleConfirmDelete}
                                                    disabled={isDeleting}
                                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                                                >
                                                    {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full flex justify-between items-center gap-4">
                                            {!isCreating ? (
                                                 <button 
                                                    onClick={handleDeleteInitiate}
                                                    className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                                                >
                                                    Excluir Projeto
                                                </button>
                                            ) : <div />}
                                            <div className="flex items-center gap-4">
                                                 <button 
                                                    onClick={isCreating ? onClose : handleEditToggle} 
                                                    className="text-sm font-bold bg-gray-200 dark:bg-zinc-700 px-4 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button 
                                                    onClick={handleSave}
                                                    disabled={isSaving}
                                                    className="bg-accent hover:bg-accent-dark text-white dark:text-zinc-900 font-bold py-2 px-6 rounded-full transition-colors duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                                                >
                                                    {isSaving ? 'Salvando...' : (isCreating ? 'Salvar Projeto' : 'Salvar Alterações')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioModal;