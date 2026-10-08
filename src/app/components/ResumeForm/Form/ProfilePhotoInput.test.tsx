import { act, fireEvent, render } from "@testing-library/react";
import { ProfilePhotoInput } from "components/ResumeForm/Form/ProfilePhotoInput";

afterEach(() => jest.restoreAllMocks());

it("照片处理期间卸载后不调用旧简历的 onChange", async () => {
  // 延迟文件读取完成，模拟照片压缩时切换简历。
  const reader = {
    result: "data:image/png;base64,original",
    onload: null as (() => void) | null,
    onerror: null,
    readAsDataURL: jest.fn(),
  };
  jest
    .spyOn(window, "FileReader")
    .mockImplementation(() => reader as unknown as FileReader);
  // 解码成功的测试图片不会发起网络请求。
  const image = {
    naturalWidth: 480,
    naturalHeight: 640,
    onload: null as (() => void) | null,
    onerror: null,
    set src(value: string) {
      this.onload?.();
    },
  };
  jest
    .spyOn(window, "Image")
    .mockImplementation(() => image as unknown as HTMLImageElement);
  jest
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({
      fillStyle: "",
      fillRect: jest.fn(),
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D);
  jest
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/jpeg;base64,compressed");
  // 回调对应已卸载的旧简历，任何晚到结果都不能调用它。
  const onChange = jest.fn();
  // 真实组件触发处理后立即卸载。
  const view = render(<ProfilePhotoInput value="" onChange={onChange} />);
  fireEvent.change(view.container.querySelector("input")!, {
    target: {
      files: [new File(["photo"], "photo.png", { type: "image/png" })],
    },
  });
  view.unmount();
  await act(async () => {
    reader.onload?.();
  });
  expect(onChange).not.toHaveBeenCalled();
});
