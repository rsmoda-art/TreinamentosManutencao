import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import plotly.express as px

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Gestão de Treinamentos Raízen", layout="wide")

# --- ESTILO CUSTOMIZADO ---
st.markdown("""
    <style>
    .main {
        background-color: #f5f5f0;
    }
    .stMetric {
        background-color: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    </style>
    """, unsafe_allow_headers=True)

# --- MOCK DATA (Substituir por conexão Firebase se necessário) ---
if 'employees' not in st.session_state:
    st.session_state.employees = [
        {"id": "1", "name": "João Silva", "role": "Operador", "dept": "Operações", "status": "active"},
        {"id": "2", "name": "Maria Santos", "role": "Técnica", "dept": "Manutenção", "status": "active"}
    ]

if 'modules' not in st.session_state:
    st.session_state.modules = [
        {"id": "m1", "title": "Segurança NR10", "freq": 12},
        {"id": "m2", "title": "Trabalho em Altura", "freq": 24}
    ]

if 'records' not in st.session_state:
    st.session_state.records = []

# --- FUNÇÕES AUXILIARES ---
def calculate_status(expiry_date_str):
    if not expiry_date_str: return "Pendente"
    today = datetime.now().date()
    expiry = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
    if expiry < today: return "Expirado"
    if expiry < today + timedelta(days=30): return "A Vencer"
    return "Conforme"

# --- SIDEBAR ---
st.sidebar.image("https://picsum.photos/seed/raizen/200/100", width=150)
st.sidebar.title("Menu Principal")
page = st.sidebar.radio("Ir para:", ["Dashboard", "Funcionários", "Matriz de Treinamento", "Agenda"])

# --- PÁGINA: DASHBOARD ---
if page == "Dashboard":
    st.title("📊 Painel de Controle")
    
    col1, col2, col3, col4 = st.columns(4)
    
    total_emp = len(st.session_state.employees)
    expired = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate')) == "Expirado")
    pending = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate')) == "A Vencer")
    
    col1.metric("Total Colaboradores", total_emp)
    col2.metric("Treinamentos Concluídos", len(st.session_state.records))
    col3.metric("Alertas Pendentes", pending)
    col4.metric("Expirados", expired)

    st.divider()
    
    st.subheader("Distribuição por Departamento")
    df_emp = pd.DataFrame(st.session_state.employees)
    fig = px.pie(df_emp, names='dept', hole=0.4, color_discrete_sequence=px.colors.qualitative.Pastel)
    st.plotly_chart(fig, use_container_width=True)

# --- PÁGINA: FUNCIONÁRIOS ---
elif page == "Funcionários":
    st.title("👥 Gestão de Funcionários")
    
    with st.form("new_employee"):
        st.subheader("Cadastrar Novo")
        c1, c2 = st.columns(2)
        name = c1.text_input("Nome")
        role = c2.text_input("Cargo")
        dept = st.selectbox("Departamento", ["Operações", "Manutenção", "Segurança", "RH"])
        if st.form_submit_button("Salvar"):
            new_id = str(len(st.session_state.employees) + 1)
            st.session_state.employees.append({"id": new_id, "name": name, "role": role, "dept": dept, "status": "active"})
            st.success("Funcionário cadastrado!")
            st.rerun()

    st.subheader("Lista Ativa")
    st.table(pd.DataFrame(st.session_state.employees))

# --- PÁGINA: MATRIZ ---
elif page == "Matriz de Treinamento":
    st.title("📋 Matriz de Qualificação")
    
    # Construção da Matriz
    matrix_list = []
    for emp in st.session_state.employees:
        row = {"Funcionário": emp['name']}
        for mod in st.session_state.modules:
            rec = next((r for r in st.session_state.records if r['empId'] == emp['id'] and r['modId'] == mod['id']), None)
            row[mod['title']] = calculate_status(rec['expiryDate']) if rec else "Não Realizado"
        matrix_list.append(row)
    
    df_matrix = pd.DataFrame(matrix_list)
    st.dataframe(df_matrix.set_index("Funcionário"), use_container_width=True)

# --- PÁGINA: AGENDA ---
elif page == "Agenda":
    st.title("📅 Cronograma de Treinamentos")
    st.info("Funcionalidade de agendamento em desenvolvimento para versão Python.")
    
    # Exemplo de calendário simples
    d = st.date_input("Selecione uma data para ver sessões", datetime.now())
    st.write("Sessões para:", d)
    st.write("Nenhuma sessão agendada para este dia.")
