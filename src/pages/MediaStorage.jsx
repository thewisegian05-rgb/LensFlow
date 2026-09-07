import React, { useState, useRef, useEffect } from "react";
import { FaFolder, FaPlus, FaEdit, FaTrash, FaFile, FaTimes } from "react-icons/fa";

function MediaStorage() {
  // Main unified tree state supporting infinite nesting initialized from localStorage
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem("mediaStorageClients");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
    return [
      {
        id: 1,
        name: "Smith_Wedding_Photos",
        isFile: false,
        subItems: [
          { 
            id: 101, 
            name: "Photos", 
            isFile: false,
            subItems: [
              { 
                id: 1001, 
                name: "RAW Photos", 
                isFile: false,
                subItems: [{ id: 10001, name: "sample_raw_1.raw", isFile: true }] 
              }, 
              { 
                id: 1002, 
                name: "EDITED Photos", 
                isFile: false,
                subItems: [{ id: 10002, name: "sample_edited_1.jpg", isFile: true, url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80" }] 
              }
            ] 
          },
          { 
            id: 102, 
            name: "Videos", 
            isFile: false,
            subItems: [
              { 
                id: 1003, 
                name: "RAW Videos", 
                isFile: false,
                subItems: [{ id: 10003, name: "sample_raw_video.mp4", isFile: true }] 
              }, 
              { 
                id: 1004, 
                name: "EDITED Videos", 
                isFile: false,
                subItems: [{ id: 10004, name: "sample_edited_video.mp4", isFile: true }] 
              }
            ] 
          }
        ]
      },
      {
        id: 2,
        name: "Arvesu_Wedding_Photos",
        isFile: false,
        subItems: [
          { 
            id: 201, 
            name: "Photos", 
            isFile: false,
            subItems: [
              { id: 2001, name: "RAW Photos", isFile: false, subItems: [] }, 
              { id: 2002, name: "EDITED Photos", isFile: false, subItems: [] }
            ] 
          },
          { 
            id: 202, 
            name: "Videos", 
            isFile: false,
            subItems: [
              { id: 2003, name: "RAW Videos", isFile: false, subItems: [] }, 
              { id: 2004, name: "EDITED Videos", isFile: false, subItems: [] }
            ] 
          }
        ]
      }
    ];
  });

  // Sync clients state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("mediaStorageClients", JSON.stringify(clients));
  }, [clients]);

  // Navigation path tracking array of IDs
  const [path, setPath] = useState([]);

  // UI interaction states
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // File viewing modal state
  const [viewingFile, setViewingFile] = useState(null);

  // Hidden file input reference for file explorer
  const fileInputRef = useRef(null);

  // Recursive helper to update nested items in the tree
  const updateItemInTree = (list, pathIds, updater, depth = 0) => {
    if (depth === pathIds.length) {
      return updater(list);
    }
    const currentId = pathIds[depth];
    return list.map(item => {
      if (item.id === currentId) {
        return {
          ...item,
          subItems: updateItemInTree(item.subItems || [], pathIds, updater, depth + 1)
        };
      }
      return item;
    });
  };

  // Resolve current container items and title based on path stack
  const getCurrentContainer = () => {
    let items = clients;
    let currentName = "Client Media Storage";

    for (let id of path) {
      const found = items.find(item => item.id === id);
      if (found) {
        currentName = found.name;
        items = found.subItems || [];
      } else {
        break;
      }
    }
    return { items, title: currentName };
  };

  const { items: currentItems, title: currentTitle } = getCurrentContainer();

  // Handle adding a new folder at the current location
  const handleAddFolderSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem = {
      id: Date.now(),
      name: newName.trim(),
      isFile: false,
      subItems: []
    };

    const updatedClients = updateItemInTree(clients, path, (list) => [...list, newItem]);
    setClients(updatedClients);

    setNewName("");
    setIsAddingFolder(false);
  };

  // Handle uploading files via FileReader to convert them to Base64 for persistent browser storage
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target.result;

      const newFileItem = {
        id: Date.now(),
        name: file.name,
        isFile: true,
        url: base64Url,
        type: file.type
      };

      const updatedClients = updateItemInTree(clients, path, (list) => [...list, newFileItem]);
      setClients(updatedClients);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Handle renaming an item anywhere in the tree
  const handleSaveEdit = (id) => {
    if (!editName.trim()) return;

    const updateItemNameRecursive = (list) => {
      return list.map(item => {
        if (item.id === id) {
          return { ...item, name: editName.trim() };
        }
        if (item.subItems) {
          return { ...item, subItems: updateItemNameRecursive(item.subItems) };
        }
        return item;
      });
    };

    setClients(updateItemNameRecursive(clients));
    setEditId(null);
  };

  // Handle deleting an item anywhere in the tree
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const idToDelete = deleteTarget.id;

    const deleteItemRecursive = (list) => {
      return list
        .filter(item => item.id !== idToDelete)
        .map(item => {
          if (item.subItems) {
            return { ...item, subItems: deleteItemRecursive(item.subItems) };
          }
          return item;
        });
    };

    setClients(deleteItemRecursive(clients));
    setDeleteTarget(null);
  };

  // Handle back navigation
  const handleBack = () => {
    setPath(path.slice(0, -1));
  };

  return (
    <div className="p-4 text-white relative">
      {/* Hidden file input supporting images and videos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*"
      />

      {/* Top action bar */}
      <div className="mb-4 flex items-center justify-between">
        {path.length > 0 ? (
          <button
            onClick={handleBack}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm transition hover:bg-slate-700"
          >
            ← Back
          </button>
        ) : <div />}

        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold transition hover:bg-sky-500"
          >
            <FaPlus /> Add
          </button>

          {/* Add Dropdown Menu */}
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-36 rounded-lg border border-slate-800 bg-slate-900 shadow-xl z-20 py-1">
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setIsAddingFolder(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <FaFolder className="text-yellow-400" /> Folder
              </button>
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  fileInputRef.current.click();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <FaFile className="text-sky-400" /> File
              </button>
            </div>
          )}
        </div>
      </div>

      <h1 className="mb-4 text-2xl font-bold">{currentTitle}</h1>

      {/* Input Form Popup for New Folder */}
      {isAddingFolder && (
        <form onSubmit={handleAddFolderSubmit} className="mb-4 flex gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
          <input
            type="text"
            placeholder="Folder name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded bg-slate-800 px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-sky-500"
            autoFocus
          />
          <button type="submit" className="rounded bg-sky-600 px-4 py-1.5 text-sm font-semibold hover:bg-sky-500">Save</button>
          <button type="button" onClick={() => setIsAddingFolder(false)} className="rounded bg-slate-700 px-3 py-1.5 text-sm hover:bg-slate-600">Cancel</button>
        </form>
      )}

      {/* Item List Display */}
      <div className="space-y-3">
        {currentItems.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (item.isFile) {
                if (item.url) {
                  setViewingFile(item);
                } else {
                  alert("No preview available for this file type or sample file.");
                }
              } else {
                setPath([...path, item.id]);
              }
            }}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition cursor-pointer hover:bg-slate-800/80"
          >
            <div className="flex items-center gap-3 flex-1">
              {item.isFile ? (
                <FaFile className="text-2xl text-sky-400" />
              ) : (
                <FaFolder className="text-2xl text-yellow-400" />
              )}
              <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                {editId === item.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded bg-slate-800 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-sky-500"
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(item.id)} className="rounded bg-green-600 px-2.5 py-1 text-xs hover:bg-green-500">Save</button>
                    <button onClick={() => setEditId(null)} className="rounded bg-slate-700 px-2.5 py-1 text-xs hover:bg-slate-600">Cancel</button>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-semibold">{item.name}</h2>
                  </div>
                )}
              </div>
            </div>

            {/* Row Actions: Edit and Delete */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {editId !== item.id && (
                <button
                  onClick={() => { setEditId(item.id); setEditName(item.name); }}
                  className="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Rename"
                >
                  <FaEdit />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(item);
                }}
                className="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
        {currentItems.length === 0 && (
          <p className="text-sm text-slate-500 italic">This folder is empty. Use the "+ Add" button to create subfolders or upload files.</p>
        )}
      </div>

      {/* File Preview Modal */}
      {viewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-semibold text-lg truncate">{viewingFile.name}</h3>
              <button
                onClick={() => setViewingFile(null)}
                className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              {viewingFile.type?.startsWith("video/") || viewingFile.name.endsWith(".mp4") ? (
                <video controls src={viewingFile.url} className="max-h-[70vh] max-w-full rounded object-contain" />
              ) : (
                <img src={viewingFile.url} alt={viewingFile.name} className="max-h-[70vh] max-w-full rounded object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-white">Delete Item?</h3>
            <p className="mb-6 text-sm text-slate-400">
              Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaStorage;
