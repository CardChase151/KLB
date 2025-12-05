import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function ImageUpload({ onImageUploaded, currentImageUrl, folder = 'general' }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || '');

  const uploadImage = async (event) => {
    try {
      setUploading(true);

      const file = event.target.files[0];
      if (!file) return;

      // Create unique filename with folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onImageUploaded(publicUrl);
      
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {previewUrl ? (
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #333',
          flexShrink: 0
        }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '8px',
          backgroundColor: '#2a2a2a',
          border: '1px dashed #555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <span style={{ color: '#666', fontSize: '0.7rem' }}>No image</span>
        </div>
      )}

      <label className="image-upload-button" style={{ cursor: 'pointer' }}>
        {uploading ? 'Uploading...' : (previewUrl ? 'Change Image' : 'Upload Image')}
        <input
          type="file"
          accept="image/*"
          onChange={uploadImage}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
}

export default ImageUpload;