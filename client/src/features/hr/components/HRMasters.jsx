import MasterDataManager from './MasterDataManager';
import * as hrAPI from '../api/hrService';

export function HRDepartments() {
    return (
        <MasterDataManager
            title="Departments"
            fetchFunction={hrAPI.getDepartments}
            createFunction={(data) => hrAPI.createDepartment(data.name)} // API expects explicit arg(s), manager gives object
            columns={[
                { header: 'ID', accessor: 'department_id' },
                { header: 'Name', accessor: 'department_name' }
            ]}
        />
    );
}

export function HRDesignations() {
    return (
        <MasterDataManager
            title="Designations"
            fetchFunction={hrAPI.getDesignations}
            createFunction={(data) => hrAPI.createDesignation({ name: data.name, level: data.level })}
            columns={[
                { header: 'Level', accessor: 'designation_level' },
                { header: 'Title', accessor: 'designation_name' }
            ]}
        />
    );
}
