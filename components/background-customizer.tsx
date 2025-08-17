"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, ImageIcon } from "lucide-react"

interface BackgroundCustomizerProps {
  onBackgroundChange?: (backgroundUrl: string | null) => void
}

export default function BackgroundCustomizer({ onBackgroundChange }: BackgroundCustomizerProps) {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Load saved background from localStorage
    const savedBackground = localStorage.getItem("backgroundImage")
    if (savedBackground) {
      setBackgroundUrl(savedBackground)
      onBackgroundChange?.(savedBackground)
    }
  }, [onBackgroundChange])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        setBackgroundUrl(url)
        localStorage.setItem("backgroundImage", url)
        onBackgroundChange?.(url)
        setIsOpen(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeBackground = () => {
    setBackgroundUrl(null)
    localStorage.removeItem("backgroundImage")
    onBackgroundChange?.(null)
    setIsOpen(false)
  }

  const predefinedBackgrounds = [
    "/serene-mountain-morning.png",
    "/soft-pastel-geometry.png",
    "/calming-watercolor-wash.png",
    "/warm-gradient-mesh.png",
  ]

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/80 backdrop-blur-sm border-white/20 hover:bg-white/90"
      >
        <ImageIcon className="h-4 w-4 mr-2" />
        Background
      </Button>

      {isOpen && (
        <Card className="absolute top-12 right-0 w-80 bg-white/90 backdrop-blur-sm border-white/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Customize Background</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload custom image */}
            <div>
              <label className="block text-sm font-medium mb-2">Upload Your Photo</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="w-full bg-transparent">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>
              </div>
            </div>

            {/* Predefined backgrounds */}
            <div>
              <label className="block text-sm font-medium mb-2">Or Choose a Style</label>
              <div className="grid grid-cols-2 gap-2">
                {predefinedBackgrounds.map((bg, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setBackgroundUrl(bg)
                      localStorage.setItem("backgroundImage", bg)
                      onBackgroundChange?.(bg)
                      setIsOpen(false)
                    }}
                    className="aspect-video rounded border-2 border-transparent hover:border-primary overflow-hidden"
                  >
                    <img
                      src={bg || "/placeholder.svg"}
                      alt={`Background option ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Remove background */}
            {backgroundUrl && (
              <Button variant="outline" onClick={removeBackground} className="w-full bg-transparent">
                Remove Background
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
