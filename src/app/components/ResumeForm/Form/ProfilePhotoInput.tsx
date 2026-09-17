import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRef, useState, type ChangeEvent } from "react";

/** 压缩后证件照的像素宽度。 */
const PHOTO_WIDTH = 480;
/** 压缩后证件照的像素高度。 */
const PHOTO_HEIGHT = 640;
/** JPEG 输出质量，在清晰度与本地存储占用之间取平衡。 */
const PHOTO_QUALITY = 0.86;
/** 允许载入浏览器处理的原图大小上限。 */
const MAX_FILE_SIZE = 12 * 1024 * 1024;
/** 支持的照片文件类型。 */
const SUPPORTED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** 将照片文件读取为浏览器可处理的数据地址。 */
const readPhotoAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    // 文件读取器负责将本地照片转换为 data URL。
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("无法读取照片"));
    };
    reader.onerror = () => reject(new Error("无法读取照片"));
    reader.readAsDataURL(file);
  });

/** 加载照片并获取其原始尺寸。 */
const loadPhoto = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    // 图片对象用于等待浏览器完成解码。
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("照片格式无法识别"));
    image.src = dataUrl;
  });

/** 将照片居中裁切为 3:4，并压缩成适合本地存储的 JPEG。 */
const compressProfilePhoto = async (file: File) => {
  // 原始照片的数据地址。
  const dataUrl = await readPhotoAsDataUrl(file);
  // 已完成解码的原始照片。
  const sourceImage = await loadPhoto(dataUrl);
  // 用于裁切和压缩的离屏画布。
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_WIDTH;
  canvas.height = PHOTO_HEIGHT;

  // 画布绘图上下文。
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器无法处理照片");
  }

  // 原图与目标证件照的宽高比。
  const sourceRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
  const targetRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
  // 居中裁切区域的尺寸与起点。
  let sourceWidth = sourceImage.naturalWidth;
  let sourceHeight = sourceImage.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = sourceImage.naturalHeight * targetRatio;
    sourceX = (sourceImage.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = sourceImage.naturalWidth / targetRatio;
    sourceY = (sourceImage.naturalHeight - sourceHeight) / 2;
  }

  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
  context.drawImage(
    sourceImage,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    PHOTO_WIDTH,
    PHOTO_HEIGHT
  );

  return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
};

/** 渲染个人照片的上传、预览、更换与删除控件。 */
export const ProfilePhotoInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  // 隐藏文件输入框的引用。
  const inputRef = useRef<HTMLInputElement>(null);
  // 当前照片处理错误。
  const [error, setError] = useState("");
  // 照片是否正在压缩。
  const [isProcessing, setIsProcessing] = useState(false);

  /** 校验并处理用户选择的照片。 */
  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    // 用户选择的第一张照片。
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!SUPPORTED_PHOTO_TYPES.has(file.type)) {
      setError("请选择 JPG、PNG 或 WebP 格式的照片");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("原图不能超过 12MB");
      return;
    }

    setError("");
    setIsProcessing(true);
    try {
      // 压缩后的证件照数据。
      const compressedPhoto = await compressProfilePhoto(file);
      onChange(compressedPhoto);
    } catch (photoError) {
      setError(
        photoError instanceof Error ? photoError.message : "照片处理失败"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /** 打开系统照片选择窗口。 */
  const handleSelectPhoto = () => inputRef.current?.click();

  /** 删除当前照片及错误信息。 */
  const handleRemovePhoto = () => {
    setError("");
    onChange("");
  };

  return (
    <div className="col-span-full">
      <div className="text-base font-medium text-gray-700">
        个人照片（可选）
      </div>
      <div className="mt-1 flex items-center gap-4 rounded-md border border-gray-300 bg-gray-50 p-3">
        {value ? (
          // data URL 已在浏览器中完成压缩，不需要 Next Image 再次优化。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="个人照片预览"
            className="h-24 w-[72px] rounded-sm border border-gray-200 bg-white object-cover"
          />
        ) : (
          <div className="flex h-24 w-[72px] items-center justify-center rounded-sm border border-dashed border-gray-300 bg-white">
            <PhotoIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSelectPhoto}
              disabled={isProcessing}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60"
            >
              {isProcessing ? "处理中..." : value ? "更换照片" : "上传照片"}
            </button>
            {value && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                删除
              </button>
            )}
          </div>
          <p className="mt-2 text-sm font-normal text-gray-500">
            支持 JPG、PNG、WebP，上传后自动居中裁切为 3:4 证件照。
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
