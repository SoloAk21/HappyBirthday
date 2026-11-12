/**
 * Text shown BEFORE unlocking (it ships in the public bundle).
 * Generic on purpose: no names, memories or private phrases. This is the only
 * file where the public-safety check allows Ethiopic script.
 */
export const PUBLIC_TEXT = {
  lang: 'am',
  title: ['ትንሽ ዓለም፣', 'ላንቺ ብቻ።'],
  subtitle: 'በሚስጥራዊ ቃላታችን ትከፈታለች።',
  label: 'ሚስጥራዊ ቃላት',
  placeholder: 'ሚስጥራዊ ቃላታችን',
  open: 'ክፈቺ',
  opening: 'እየተከፈተ ነው…',
  wrong: 'ልክ አይደለም። ቃላቱን በቀስታ እንደገና ሞክሪ።',
  rateLimited: 'ትንሽ እንረፍ። ከ{min} ደቂቃ በኋላ እንደገና ሞክሪ።',
  unavailable: 'ዓለሟ ገና እየነቃች ነው። ትንሽ ቆይተሽ እንደገና ሞክሪ።',
  loading: 'እየተከፈተ ነው',
  error: 'ከዋክብቱ ትንሽ አፍረዋል።',
  retry: 'እንደገና ሞክሪ',
} as const;
