'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Settings() {
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')

  const handleExport = async () => {
    setExportStatus('loading')
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pramana-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportStatus('idle')
    } catch {
      setExportStatus('error')
    }
  }

  const handleDelete = async () => {
    setDeleteStatus('loading')
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
      setDeleteStatus('done')
    } catch {
      setDeleteStatus('error')
    }
  }

  return (
    <main className="max-w-[640px] mx-auto px-[var(--space-sm)] py-[var(--space-2xl)]">
      <header className="mb-[var(--space-xl)] flex items-baseline justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-[1.75rem] leading-tight text-[var(--color-text)]">
            Settings
          </h1>
          <p className="mt-[var(--space-3xs)] text-sm text-[var(--color-text-muted)]">Your data, your terms.</p>
        </div>
        <Link href="/" className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
          Back to chat
        </Link>
      </header>

      <div className="flex flex-col gap-[var(--space-2xl)]">
        <section className="flex flex-col gap-[var(--space-2xs)]">
          <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
            Export your data
          </h2>
          <p className="text-base text-[var(--color-text-secondary)] max-w-[65ch]">
            Every session, set, PR, and working-load record tied to your account, as a single JSON file.
          </p>
          <div className="mt-[var(--space-2xs)]">
            <button
              onClick={handleExport}
              disabled={exportStatus === 'loading'}
              className="bg-[var(--color-ink)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 hover:bg-[var(--color-ink-hover)] disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
            >
              {exportStatus === 'loading' ? 'Preparing export…' : 'Download my data'}
            </button>
            {exportStatus === 'error' && (
              <p role="alert" className="mt-[var(--space-2xs)] text-sm text-[var(--color-error)]">
                Couldn&apos;t prepare the export. Try again.
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-[var(--space-2xs)] pt-[var(--space-lg)] border-t border-[var(--color-border)]">
          <h2 className="text-xs font-medium tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
            Delete your data
          </h2>

          {deleteStatus === 'done' ? (
            <p className="text-base text-[var(--color-text)]">
              Your account and every record tied to it have been permanently deleted.
            </p>
          ) : (
            <>
              <p className="text-base text-[var(--color-text-secondary)] max-w-[65ch]">
                Permanently deletes your account and every session, set, PR, and working-load record. This can&apos;t
                be undone.
              </p>
              <div className="mt-[var(--space-2xs)] flex items-center gap-[var(--space-sm)]">
                {!confirmingDelete ? (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="text-base text-[var(--color-error)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-error)]"
                  >
                    Delete my account
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleDelete}
                      disabled={deleteStatus === 'loading'}
                      className="bg-[var(--color-error)] text-[var(--color-surface)] text-base rounded-[6px] px-[var(--space-md)] py-[var(--space-xs)] transition-colors duration-150 disabled:opacity-40 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-error)]"
                    >
                      {deleteStatus === 'loading' ? 'Deleting…' : 'Yes, permanently delete everything'}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="text-sm text-[var(--color-text-secondary)] underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
              {deleteStatus === 'error' && (
                <p role="alert" className="text-sm text-[var(--color-error)]">
                  Couldn&apos;t delete your account. Try again.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
