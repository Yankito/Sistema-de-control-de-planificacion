import { useState, useMemo, useEffect } from "react";
import { BacklogStats } from "../logic/backlogAnalysis";
import { TechStats } from "../logic/technicianAnalysis";

export const useDashboardList = (
    flowStats: BacklogStats,
    techStats: TechStats[],
    itemsPerPage: number = 50
) => {
    const [activeTab, setActiveTab] = useState<"FLOW" | "TECNICOS">("FLOW");
    const [subTabFlow, setSubTabFlow] = useState<"NUEVAS" | "CAMBIOS" | "FINALIZADAS">("NUEVAS");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterPlanta, setFilterPlanta] = useState("TODAS");
    const [page, setPage] = useState(1);

    // Reset página al cambiar filtros
    useEffect(() => { setPage(1); }, [activeTab, subTabFlow, filterPlanta, searchTerm]);

    // Lógica de Filtrado (Movida desde la vista)
    const listToDisplay = useMemo(() => {
        let list: any[] = [];
        
        if (activeTab === "FLOW") {
            if (subTabFlow === "NUEVAS") list = flowStats.nuevas;
            else if (subTabFlow === "CAMBIOS") list = flowStats.conAvance;
            else list = flowStats.finalizadas;
        } else {
            list = techStats;
        }

        return list.filter(item => {
            const matchPlanta = filterPlanta === "TODAS" || (
                activeTab === "TECNICOS" 
                ? (item as TechStats).plantas.includes(filterPlanta) 
                : item.planta === filterPlanta
            );

            const term = searchTerm.toLowerCase();
            const matchSearch = !term || (
                'ot' in item 
                ? (item.ot.toLowerCase().includes(term) || item.descripcion.toLowerCase().includes(term)) 
                : item.nombre.toLowerCase().includes(term)
            );
            
            return matchPlanta && matchSearch;
        });
    }, [activeTab, subTabFlow, flowStats, techStats, filterPlanta, searchTerm]);

    const totalPages = Math.ceil(listToDisplay.length / itemsPerPage);
    const paginatedList = listToDisplay.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return {
        // Estados
        activeTab, setActiveTab,
        subTabFlow, setSubTabFlow,
        searchTerm, setSearchTerm,
        filterPlanta, setFilterPlanta,
        page, setPage,
        // Data calculada
        paginatedList,
        totalPages
    };
};