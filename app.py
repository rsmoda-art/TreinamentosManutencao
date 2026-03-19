import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import plotly.express as px

# --- CONFIGURAÇÃO DA PÁGINA ---
st.set_page_config(page_title="Gestão de Treinamentos - Raízen", layout="wide")

# --- ESTILO CUSTOMIZADO ---
st.markdown("""
    <style>
    .main {
        background-color: #f5f5f0;
    }
    div[data-testid="stMetric"] {
        background-color: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.05);
        border: 1px solid #e0e0e0;
    }
    </style>
    """, unsafe_allow_html=True)

# --- INICIALIZAÇÃO DE DADOS (Persistência na Sessão) ---
if 'employees' not in st.session_state:
    st.session_state.employees = [
        {"id": "1", "name": "João Silva", "role": "Operador", "dept": "Operações", "status": "active"},
        {"id": "2", "name": "Maria Santos", "role": "Técnica", "dept": "Manutenção", "status": "active"}
    ]

if 'modules' not in st.session_state:
    st.session_state.modules = [
        {"id": "m1", "title": "Segurança NR10", "freq": 12},
        {"id": "m2", "title": "Trabalho em Altura", "freq": 24},
        {"id": "m3", "title": "Espaço Confinado NR33", "freq": 12}
    ]

if 'records' not in st.session_state:
    # Exemplo inicial de treinamento vencido para teste
    st.session_state.records = [
        {"empId": "1", "modId": "m1", "completionDate": "2023-01-01", "expiryDate": "2024-01-01"}
    ]

# --- FUNÇÕES AUXILIARES ---
def calculate_status(expiry_date_str):
    if not expiry_date_str: return "Pendente"
    try:
        today = datetime.now().date()
        expiry = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
        if expiry < today: return "Expirado"
        if expiry < today + timedelta(days=30): return "A Vencer"
        return "Conforme"
    except:
        return "Erro na Data"

# --- SIDEBAR ---
st.sidebar.title("🛠️ Manutenção")
st.sidebar.subheader("Matrix Pro System")
page = st.sidebar.radio("Navegação:", ["Dashboard", "Funcionários", "Matriz de Treinamento", "Lançar Treinamento"])

# --- PÁGINA: DASHBOARD ---
if page == "Dashboard":
    st.title("📊 Painel de Controle")
    
    col1, col2, col3, col4 = st.columns(4)
    
    total_emp = len(st.session_state.employees)
    expired_count = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate')) == "Expirado")
    warning_count = sum(1 for r in st.session_state.records if calculate_status(r.get('expiryDate')) == "A Vencer")
    
    col1.metric("Total Colaboradores", total_emp)
    col2.metric("Treinamentos Realizados", len(st.session_state.records))
    col3.metric("A Vencer (30 dias)", warning_count)
    col4.metric("Expirados", expired_count, delta_color="inverse")

    st.divider()
    
    c1, c2 = st.columns([1, 1])
    with c1:
        st.subheader("Distribuição por Departamento")
        df_emp = pd.DataFrame(st.session_state.employees)
        fig = px.pie(df_emp, names='dept', hole=0.4, color_discrete_sequence=px.colors.qualitative.Safe)
        st.plotly_chart(fig, use_container_width=True)
        
    with c2:
        st.subheader("⚠️ Lista Detalhada de Alertas")
        alert_data = []
        for rec in st.session_state.records:
            status = calculate_status(rec.get('expiryDate'))
            if status in ["Expirado", "A Vencer"]:
                emp = next((e for e in st.session_state.employees if e['id'] == rec['empId']), None)
                mod = next((m for m in st.session_state.modules if m['id'] == rec['modId']), None)
                if emp and mod:
                    alert_data.append({"Colaborador": emp['name'], "Treinamento": mod['title'], "Status": status})
        
        if alert_data:
            st.dataframe(pd.DataFrame(alert_data), use_container_width=True, hide_index=True)
        else:
            st.success("Nenhum alerta crítico no momento!")

# --- PÁGINA: FUNCIONÁRIOS ---
elif page == "Funcionários":
    st.title("👥 Gestão de Funcionários")
    
    with st.expander("➕ Cadastrar Novo Funcionário"):
        with st.form("new_employee"):
            c1, c2 = st.columns(2)
            name = c1.text_input("Nome Completo")
            role = c2.text_input("Cargo")
            dept = st.selectbox("Departamento", ["Operações", "Manutenção", "Segurança", "RH", "Laboratório"])
            if st.form_submit_button("Confirmar Cadastro"):
                if name and role:
                    new_id = str(len(st.session_state.employees) + 1)
                    st.session_state.employees.append({"id": new_id, "name": name, "role": role, "dept": dept, "status": "active"})
                    st.success(f"{name} adicionado com sucesso!")
                    st.rerun()

    st.subheader("Lista de Colaboradores")
    df_display = pd.DataFrame(st.session_state.employees).drop(columns=['id'])
    st.dataframe(df_display, use_container_width=True)

# --- PÁGINA: MATRIZ ---
elif page == "Matriz de Treinamento":
    st.title("📋 Matriz de Qualificação")
    
    matrix_list = []
    for emp in st.session_state.employees:
        row = {"Funcionário": emp['name'], "Depto": emp['dept']}
        for mod in st.session_state.modules:
            # Pega o registro mais recente para este par funcionário/módulo
            rec = next((r for r in st.session_state.records if r['empId'] == emp['id'] and r['modId'] == mod['id']), None)
            row[mod['title']] = calculate_status(rec['expiryDate']) if rec else "Não Realizado"
        matrix_list.append(row)
    
    st.dataframe(pd.DataFrame(matrix_list).set_index("Funcionário"), use_container_width=True)
    st.caption("Legenda: Conforme (Válido) | A Vencer (Próximo 30 dias) | Expirado (Vencido)")

# --- PÁGINA: LANÇAR TREINAMENTO ---
elif page == "Lançar Treinamento":
    st.title("📝 Registrar Conclusão")
    st.info("Utilize este formulário para atualizar a data de realização de um treinamento.")
    
    with st.form("log_training"):
        emp_name = st.selectbox("Selecione o Funcionário", [e['name'] for e in st.session_state.employees])
        mod_title = st.selectbox("Selecione o Treinamento", [m['title'] for m in st.session_state.modules])
        comp_date = st.date_input("Data de Realização", datetime.now())
        
        if st.form_submit_button("Salvar Registro"):
            # Encontrar IDs
            emp_id = next(e['id'] for e in st.session_state.employees if e['name'] == emp_name)
            mod_obj = next(m for m in st.session_state.modules if m['title'] == mod_title)
            
            # Calcular validade
            expiry_date = comp_date + timedelta(days=30 * mod_obj['freq'])
            
            # Remover registro antigo se existir e adicionar novo
            st.session_state.records = [r for r in st.session_state.records if not (r['empId'] == emp_id and r['modId'] == mod_obj['id'])]
            st.session_state.records.append({
                "empId": emp_id,
                "modId": mod_obj['id'],
                "completionDate": comp_date.strftime('%Y-%m-%d'),
                "expiryDate": expiry_date.strftime('%Y-%m-%d')
            })
            st.success(f"Treinamento de {mod_title} registrado para {emp_name}!")
            st.balloons()
