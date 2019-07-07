// eslint-disable
// this is an auto generated file. This will be overwritten

export const getDevice = `query GetDevice($id: ID!) {
  getDevice(id: $id) {
    seat
    id
    data
  }
}
`;
export const listDevices = `query ListDevices(
  $filter: ModelDeviceFilterInput
  $limit: Int
  $nextToken: String
) {
  listDevices(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      seat
      id
      data
    }
    nextToken
  }
}
`;
