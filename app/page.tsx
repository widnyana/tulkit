import { SiteJsonLd } from "@/components/ToolJsonLd";
import { ToolsDirectory } from "@/components/tools-directory";
import { tools } from "@/lib/tools";

export default function Home() {
  return (
    <>
      <SiteJsonLd />
      <div className="mx-auto w-full max-w-4xl px-5 pt-14 pb-20 sm:px-6 sm:pt-20">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            tulkit
          </h1>
          <p className="mt-3 max-w-prose text-base text-muted-foreground">
            because apparently, you *do* need another random tool on the
            internet. ¯\_(ツ)_/¯
          </p>
        </header>

        <p className="sr-only">
          tulkit is a collection of focused developer utilities that run
          entirely in your browser. No signups, no tracking, no &quot;we reserve
          the right to use your data for training.&quot; Just tools that do one
          thing well and get out of your way. Whether you&apos;re comparing
          environment configs before a deploy, generating a clean invoice for
          freelance work, or sanity-checking an IP plan, each tool here is built
          to save you a few minutes of friction. Because apparently, you *do*
          need another random tool on the internet — might as well be one that
          doesn&apos;t phone home. Everything stays local: your files, your
          configs, your data. We just provide the interface.
        </p>

        <section aria-labelledby="tools-heading" className="mt-10">
          <h2 id="tools-heading" className="sr-only">
            Tools
          </h2>
          <ToolsDirectory tools={tools} />
          <p className="mt-10 text-sm text-muted-foreground">
            More tools are trapped in the backlog. Please hold for your
            inevitable convenience.
          </p>
        </section>
      </div>
    </>
  );
}
