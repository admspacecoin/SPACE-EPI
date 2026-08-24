export type Attribute = { id: string; nome: string }
export type AttributeValue = { id: string; attribute_id: string; valor: string }

export type VariantValue = {
  attribute_value_id: string
  valor: string
  attribute_id: string
  attribute_nome: string
}

export type Variant = {
  id: string
  ppe_item_id: string
  sku_gerado: string | null
  status: 'ativo' | 'inativo'
  values: VariantValue[]
}
