import {Navbar} from "@/components/ui/Navbar"

export function App({children}) {

    const style = { "min_width": "var(--breakpoint-xs)" } as React.CSSProperties;

    return (
        <div className="text-center">
            <div className="overflow-auto w-full h-screen" style={style}>
                <Navbar/>
                {children}
            </div>
        </div>
    )
}
