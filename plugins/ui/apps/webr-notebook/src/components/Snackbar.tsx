import { useEffect, type FC } from 'react'
import './Snackbar.scss'

interface SnackbarProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export const Snackbar: FC<SnackbarProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return <div className={`snackbar snackbar--${type}`}>{message}</div>
}
