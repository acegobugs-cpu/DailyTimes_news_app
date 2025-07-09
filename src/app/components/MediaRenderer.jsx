export default function MediaRenderer({
  media,
  className = "",
  controls = true,
  autoPlay = false,
  loop = false,
}) {
  if (!media || !media.url || !media.mediaType) {
    return <p className="text-gray-400 italic">No media provided</p>;
  }
  let src = media.url;
  if (media.source === "local" && !src.startsWith("http")) {
    src = `${process.env.NEXT_PUBLIC_API_URL}${media.url}`;
  }

  switch (media.mediaType) {
    case "image":
      return (
        <img
          src={src}
          alt={media.alt || "Media"}
          className={`object-cover rounded ${className}`}
          loading="lazy"
        />
      );

    case "video":
      return (
        <iframe
          src={src}
          className={`rounded ${className}`}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
        >
          Your browser does not support the video tag.
        </iframe>
      );

    case "audio":
      return (
        <audio
          src={src}
          controls={controls}
          className={`w-full ${className}`}
        >
          Your browser does not support the audio tag.
        </audio>
      );

    case "embed":
      return (
        <iframe
          src={src}
          title="Embedded Media"
          className={`w-full aspect-video rounded ${className}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );

    default:
      return <p className="text-red-500 italic">Unsupported media type: {media.mediaType}</p>;
  }
}
