"use client";

type AlbumDetailsProps = {
  name: string;
  artist: string;
  color: string;
  backgroundColor: string;
};

export function AlbumDetails({
  color,
  backgroundColor,
  name,
  artist,
}: AlbumDetailsProps) {
  return (
    <div className="absolute flex items-start flex-col justify-end top-0 left-0 text-wrap font-medium h-full pb-1 px-1 w-fit ">
      <div
        className="font-bold text-[9px]/[10px] pb-0.5"
        style={
          {
            color,
          } as React.CSSProperties
        }
      >
        <span
          className="wrap-break-word"
          style={
            {
              backgroundColor,
            } as React.CSSProperties
          }
        >
          {name}
        </span>
      </div>
      <div
        className="text-[7px]/[7px] font-medium "
        style={
          {
            color,
          } as React.CSSProperties
        }
      >
        <span
          className="wrap-break-word"
          style={
            {
              backgroundColor,
            } as React.CSSProperties
          }
        >
          {artist}
        </span>
      </div>
    </div>
  );
}
