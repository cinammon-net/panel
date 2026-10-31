import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
    getWorker(_moduleId, label) {
        if (label === 'json') return new JsonWorker();
        if (['css', 'scss', 'less'].includes(label)) return new CssWorker();
        if (['html', 'handlebars', 'razor'].includes(label)) return new HtmlWorker();
        if (['typescript', 'javascript'].includes(label)) return new TsWorker();
        return new EditorWorker();
    },
};
loader.config({ monaco });

export default function FileEditor({ value, language, onChange, onSave, disabled }: { value: string; language: string; onChange: (value: string) => void; onSave: () => void; disabled: boolean }) {
    return <Editor height="58vh" theme="vs-dark" language={language} value={value} onChange={value => onChange(value ?? '')}
        options={{ readOnly: disabled, minimap: { enabled: false }, fontSize: 14, tabSize: 4, scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 16 } }}
        onMount={editor => { editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave); }} />;
}
