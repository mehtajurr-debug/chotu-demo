// Shrinks a photo the caregiver picks so it can be kept in localStorage (a few tens of KB, not MBs).
export function fileToSmallDataUrl(file, maxSide = 480, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; // transparent PNGs get a white background
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
}

/** A sharper copy for reading text (prescriptions): from a file or an image address. Returns base64 JPEG without the prefix. */
export function imageForReading(fileOrSrc, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const isFile = typeof fileOrSrc !== 'string';
    const url = isFile ? URL.createObjectURL(fileOrSrc) : fileOrSrc;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      if (isFile) URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.88).split(',')[1]);
    };
    img.onerror = () => { if (isFile) URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
}
