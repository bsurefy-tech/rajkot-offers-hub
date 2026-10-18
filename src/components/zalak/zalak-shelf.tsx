import Image from "next/image";
import { Link } from "@/components/i18n/link";
import type { ZalakStory } from "@/lib/zalak/types";
import { ShopAvatar } from "./avatar";

/** The Zalak shelf on the home page: tall reel cards that open the viewer on that reel. */
export function ZalakShelf({ stories }: { stories: ZalakStory[] }) {
  return (
    <ul className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible lg:px-0">
      {stories.map((story) => (
        <li key={story.id} className="w-[calc((100vw-2.75rem)/2.08)] shrink-0 lg:w-auto">
          <Link
            href={`/zalak?start=${encodeURIComponent(story.id)}`}
            className="group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-skeleton"
          >
            {story.clips[0].kind === "video" ? (
              // A video's still comes from the video host, whose address changes per account: shown as it is.
              story.clips[0].poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.clips[0].poster} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" />
              )
            ) : (
              <Image
                src={story.clips[0].src}
                alt=""
                fill
                sizes="(min-width: 1024px) 190px, 165px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            <span aria-hidden className="absolute inset-0 bg-linear-to-b from-black/35 via-transparent via-40% to-black/80" />
            <span className="absolute top-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 text-micro font-semibold text-white">
              <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white bg-white/25">
                <ShopAvatar shop={story.shop} sizes="24px" iconSize={12} />
              </span>
              <span className="truncate">{story.shop.name}</span>
            </span>
            <span className="absolute inset-x-2.5 bottom-2.5 truncate text-caption leading-snug font-semibold text-white">{story.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
