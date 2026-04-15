import { DropdownMenuItem } from "~/components/ui/dropdown-menu";

export function MenuItem(props) {
  return (
    <DropdownMenuItem
        className="p-0 pl-2 pr-2 hover:bg-mgray-300 hover:hover-shadow-text rounded-sm whitespace-nowrap text-sm"
    >
        <a href={`${props.link}`} className="w-full">{props.text}</a>
    </DropdownMenuItem>
  )
}
