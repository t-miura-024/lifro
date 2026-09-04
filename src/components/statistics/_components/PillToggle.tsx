'use client'

import { Box } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

type PillToggleOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  value: T
  options: PillToggleOption<T>[]
  onChange: (value: T) => void
}

export default function PillToggle<T extends string>({ value, options, onChange }: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    const selectedIndex = options.findIndex((opt) => opt.value === value)
    const buttons = containerRef.current.querySelectorAll<HTMLElement>('[data-pill-button]')

    if (buttons[selectedIndex]) {
      const button = buttons[selectedIndex]
      setIndicatorStyle({
        left: button.offsetLeft,
        width: button.offsetWidth,
      })
    }
  }, [value, options])

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'inline-flex',
        position: 'relative',
        bgcolor: 'action.hover',
        borderRadius: '16px',
        p: '3px',
      }}
    >
      {/* スライドする背景 */}
      <Box
        sx={{
          position: 'absolute',
          top: '3px',
          height: 'calc(100% - 6px)',
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          bgcolor: 'background.paper',
          borderRadius: '13px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'left 0.2s ease-out, width 0.2s ease-out',
        }}
      />

      {/* ボタン */}
      {options.map((option) => (
        <Box
          key={option.value}
          data-pill-button
          onClick={() => onChange(option.value)}
          sx={{
            position: 'relative',
            zIndex: 1,
            px: 1.5,
            py: 0.5,
            fontSize: '0.8125rem',
            fontWeight: value === option.value ? 600 : 400,
            color: value === option.value ? 'text.primary' : 'text.secondary',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'color 0.15s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          {option.label}
        </Box>
      ))}
    </Box>
  )
}
