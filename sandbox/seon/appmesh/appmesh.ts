import * as cdk from 'aws-cdk-lib';
import * as appmesh from 'aws-cdk-lib/aws-appmesh';

/*
 * A service mesh is a logical boundary for network traffic between the services that reside within it.
 *
 * After you create your service mesh, you can create virtual services, virtual nodes,
 * virtual routers, and routes to distribute traffic between the applications in your mesh.
 *
 */

const createAppMesh = ({ mesh_name, stack }: { mesh_name: string; stack: cdk.Stack }) => {
    const mesh = new appmesh.Mesh(stack, mesh_name, {
        egressFilter: appmesh.MeshFilterType.ALLOW_ALL,
        meshName: mesh_name,
        serviceDiscovery: {
            ipPreference: appmesh.IpPreference.IPV4_ONLY,
        },
    });

    /*
     * VirtualRouters
     * - A mesh uses virtual routers as logical units to route requests to virtual nodes.
     *
     */
};

export default createAppMesh;
