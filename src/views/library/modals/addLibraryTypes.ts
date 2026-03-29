export type LibrarySourceKind = 'wordpress.org' | 'library_upload' | 'remote_url';

export type AddLibrarySourcePayload =
  | { mode: 'direct'; source: LibrarySourceKind }
  | { mode: 'prefill'; source: LibrarySourceKind; pluginName: string; pluginSlug: string };
