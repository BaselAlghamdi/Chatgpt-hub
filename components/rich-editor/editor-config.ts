import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {TableKit} from '@tiptap/extension-table';
import {AudioBlock,Callout,Equation,FinanceImage,Footnote,Gallery,InlineEquation,SafeEmbed,TableOfContents} from './extensions';
export const researchExtensions=()=>[
  StarterKit.configure({heading:{levels:[1,2,3,4]},link:false,underline:false}),Underline,Link.configure({openOnClick:false,autolink:true,defaultProtocol:'https'}),TextAlign.configure({types:['heading','paragraph']}),Subscript,Superscript,TableKit.configure({table:{resizable:true}}),Placeholder.configure({placeholder:'Start writing your research…'}),CharacterCount.configure({limit:160000}),FinanceImage,Gallery,Callout,Equation,InlineEquation,Footnote,SafeEmbed,AudioBlock,TableOfContents
 ];
