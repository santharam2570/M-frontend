const PROFILE_IMAGE_MAX_SIZE_KB = 512;

export const PROFILE_IMAGE_MAX_SIZE_BYTES = PROFILE_IMAGE_MAX_SIZE_KB * 1024;

export const PROFILE_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const PROFILE_IMAGE_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export const PROFILE_IMAGE_ALLOWED_FORMATS_LABEL = "JPG, JPEG, PNG, WEBP";

export const PROFILE_IMAGE_MAX_SIZE_LABEL = `${PROFILE_IMAGE_MAX_SIZE_KB} KB`;

export const isAllowedProfileImageType = (file: File) => {
  if (PROFILE_IMAGE_ALLOWED_MIME_TYPES.includes(file.type)) {
    return true;
  }

  const extension = file.name?.split(".").pop()?.toLowerCase();

  if (!extension) {
    return false;
  }

  return PROFILE_IMAGE_ALLOWED_EXTENSIONS.includes(`.${extension}`);
};

