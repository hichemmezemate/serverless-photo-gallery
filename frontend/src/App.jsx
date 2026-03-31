import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import './App.css';

const API_BASE = "https://your-api-gateway-url"; // ← à remplacer par votre URL API Gateway
const CLOUDFRONT_URL = "https://your-cloudfront-url"; // ← à remplacer par votre URL CloudFront

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'your-user-pool-id', // ← à remplacer par votre User Pool ID
      userPoolClientId: 'your-user-pool-client-id' // ← à remplacer par votre User Pool Client ID
    }
  }
});

const getToken = async () => {
  const session = await fetchAuthSession();
  return session.tokens.idToken.toString();
};

function Lightbox({ photo, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close">✕ Fermer</button>
      <img
        className="lightbox-img"
        src={`${CLOUDFRONT_URL}/${photo.ThumbnailKey}`}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />
      <div className="lightbox-date">
        📅 {new Date(photo.CreatedAt).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric'
        })}
      </div>
    </div>
  );
}

function Gallery({ user, signOut }) {
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => { fetchPhotos(); }, []);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/photos`, {
        headers: { Authorization: token }
      });
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setUploadStatus("⚠ Fichier image uniquement");
      return;
    }
    setUploading(true);
    setProgress(10);
    setUploadStatus("Connexion...");
    try {
      const token = await getToken();
      setProgress(25); setUploadStatus("Génération URL...");
      const res = await fetch(
        `${API_BASE}/upload-url?fileName=${encodeURIComponent(file.name)}`,
        { headers: { Authorization: token } }
      );
      const { uploadUrl, fileKey } = await res.json();
      setProgress(45); setUploadStatus("Upload en cours...");
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setProgress(75); setUploadStatus("Traitement miniature...");
      setTimeout(async () => {
        setProgress(95);
        await fetchPhotos();
        setProgress(100);
        setUploadStatus("✓ Photo ajoutée !");
        setTimeout(() => { setUploading(false); setProgress(0); setUploadStatus(""); }, 2000);
      }, 4000);
    } catch (err) {
      setUploadStatus(`✗ ${err.message}`);
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    uploadFile(e.dataTransfer.files[0]);
  }, []);

  return (
    <div className="gallery-app">
      <div className="orb-extra" />

      <header className="gallery-header">
        <div className="gallery-header-left">
          <h1>✦ Gallery</h1>
          <span className="photo-count">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>
        <div className="gallery-header-right">
          <span className="username-label">👤 {user.username}</span>
          <button className="signout-btn" onClick={signOut}>Déconnexion</button>
        </div>
      </header>

      <main className="gallery-main">
        {/* Drop Zone */}
        <div
          className={`drop-zone${dragging ? ' dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => uploadFile(e.target.files[0])}
          />
          {uploading ? (
            <>
              <div className="upload-status">{uploadStatus}</div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              <span className="drop-icon">🌅</span>
              <div className="drop-label">
                {dragging ? 'Dépose ta photo ici !' : 'Glisse une photo ou clique pour uploader'}
              </div>
              <div className="drop-sublabel">PNG, JPG, WEBP — max 10 MB</div>
            </>
          )}
        </div>

        {/* Galerie */}
        {loadingPhotos ? (
          <div className="loading-state">Chargement de ta galerie...</div>
        ) : photos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <div className="empty-label">Ta galerie est vide</div>
            <div className="empty-sublabel">Uploade ta première photo pour commencer</div>
          </div>
        ) : (
          <div className="masonry gallery-appear">
            {photos.map((photo) => (
              <div
                key={photo.PhotoId}
                className="masonry-item"
                onClick={() => setLightboxPhoto(photo)}
              >
                <img
                  src={`${CLOUDFRONT_URL}/${photo.ThumbnailKey}`}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    setTimeout(() => {
                      e.target.src = `${CLOUDFRONT_URL}/${photo.ThumbnailKey}?v=${Date.now()}`;
                    }, 2000);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {lightboxPhoto && (
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Authenticator loginMechanisms={['email']}>
      {({ signOut, user }) => <Gallery user={user} signOut={signOut} />}
    </Authenticator>
  );
}